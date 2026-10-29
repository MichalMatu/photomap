from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "scripts" / "content"))

from place_editorial_audit import audit, load_blocks, load_exceptions, main  # noqa: E402


def sample_db(tmp_path: Path) -> Path:
    path = tmp_path / "content.db"
    with sqlite3.connect(path) as db:
        db.executescript(
            """
            CREATE TABLE place (
                id TEXT, slug TEXT, title TEXT, description TEXT, local_comment TEXT,
                article_blocks TEXT, status TEXT, cover_photo_id TEXT
            );
            CREATE TABLE photo (
                id TEXT, place_id TEXT, status TEXT, caption TEXT,
                description_blocks TEXT, attribution_author TEXT,
                attribution_source_url TEXT, attribution_license TEXT,
                attribution_license_url TEXT
            );
            INSERT INTO place VALUES
            ('p1', 'test-place', 'Test place',
             'A useful description long enough to pass the short-description warning.',
             'Local editorial context', '[{"type":"paragraph","text":"Original history"}]',
             'published', 'f1'),
            ('p2', 'draft-place', 'Draft', NULL, NULL, NULL, 'draft', NULL);
            INSERT INTO photo VALUES
            ('f1', 'p1', 'approved', NULL, '[]', NULL, NULL, NULL, NULL),
            ('f2', 'p1', 'approved', 'Known subject', '[]', 'Author',
             'https://example.org/photo', 'CC BY', 'https://example.org/license'),
            ('f3', 'p1', 'rejected', NULL, '[]', NULL, NULL, NULL, NULL);
            """
        )
    return path


def test_finds_photo_omissions_and_treats_missing_optional_blocks_as_info(tmp_path: Path) -> None:
    path = sample_db(tmp_path)
    original = path.read_bytes()
    report = audit(str(path))
    assert report["places_audited"] == 1
    assert report["approved_photos_audited"] == 2
    assert report["blocking_issue_count"] == 2
    assert report["photo_issues_by_type"] == {
        "missing_caption": 1, "incomplete_attribution": 1,
    }
    assert report["optional_photo_descriptions_missing"] == 2
    assert report["blocking_place_issues"] == []
    assert path.read_bytes() == original  # Audit opens SQLite read-only.


def test_explicit_user_exception_avoids_blocking_but_keeps_visible_warning(tmp_path: Path) -> None:
    path = sample_db(tmp_path)
    report = audit(str(path), exceptions={"f1": "Keep untouched at owner's request"})
    assert report["blocking_issue_count"] == 0
    assert len(report["accepted_photo_issues"]) == 2
    assert all(x["reason"] == "Keep untouched at owner's request" for x in report["accepted_photo_issues"])
    assert {x["flag"] for x in report["photo_issues"]} == {
        "missing_caption", "incomplete_attribution"
    }


def test_missing_place_fields_and_orphaned_exception_are_blocking(tmp_path: Path) -> None:
    path = sample_db(tmp_path)
    with sqlite3.connect(path) as db:
        db.execute(
            "UPDATE place SET description=NULL, local_comment=NULL, article_blocks='[]', "
            "cover_photo_id='missing' WHERE id='p1'"
        )
    report = audit(str(path), exceptions={"f1": "Keep", "orphaned": "Old exception"})
    assert {x["flag"] for x in report["blocking_place_issues"]} == {
        "missing_description", "missing_local_comment", "missing_article",
        "cover_missing_from_approved_photos",
    }
    assert report["unmatched_exceptions"] == ["orphaned"]
    assert report["blocking_issue_count"] == 5


def test_exceptions_require_explicit_reason_and_unique_id(tmp_path: Path) -> None:
    path = tmp_path / "exceptions.json"
    path.write_text(json.dumps({"schema_version": 1, "media_exceptions": [
        {"photo_id": "f1", "reason": "Keep unchanged"},
    ]}), encoding="utf-8")
    assert load_exceptions(str(path)) == {"f1": "Keep unchanged"}
    path.write_text(json.dumps({"schema_version": 1, "media_exceptions": [
        {"photo_id": "f1", "reason": "Keep unchanged"},
        {"photo_id": "f1", "reason": "Duplicate"},
    ]}), encoding="utf-8")
    with pytest.raises(ValueError, match="Duplicate"):
        load_exceptions(str(path))


def test_invalid_json_blocks_do_not_crash_audit(tmp_path: Path) -> None:
    path = sample_db(tmp_path)
    with sqlite3.connect(path) as db:
        db.execute("UPDATE place SET article_blocks='[1,null,{},\"bad\"]' WHERE id='p1'")
        db.execute("UPDATE photo SET description_blocks='invalid' WHERE id='f1'")
    assert load_blocks('[1,{"type":"paragraph","text":"OK"}]') == [
        {"type": "paragraph", "text": "OK"}
    ]
    report = audit(str(path), exceptions={"f1": "Keep"})
    assert report["places_audited"] == 1
    assert report["optional_photo_descriptions_missing"] == 2


def test_cli_strict_exit_code(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = sample_db(tmp_path)
    out = tmp_path / "reports" / "editorial.json"
    monkeypatch.setattr(sys, "argv", [
        "place_editorial_audit.py", "--database", str(path), "--output", str(out), "--strict",
    ])
    assert main() == 1
    assert json.loads(out.read_text(encoding="utf-8"))["blocking_issue_count"] == 2
    exceptions = tmp_path / "exceptions.json"
    exceptions.write_text(json.dumps({
        "schema_version": 1,
        "media_exceptions": [{"photo_id": "f1", "reason": "Keep unchanged"}],
    }), encoding="utf-8")
    monkeypatch.setattr(sys, "argv", [
        "place_editorial_audit.py", "--database", str(path), "--output", str(out),
        "--exceptions", str(exceptions), "--strict",
    ])
    assert main() == 0
