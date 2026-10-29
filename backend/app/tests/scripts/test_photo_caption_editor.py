from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "scripts" / "content"))

from photo_caption_editor import (  # noqa: E402
    check_plan,
    load_plan,
    open_readonly,
    protected_ids,
    repeated_count,
)


def database(tmp_path: Path) -> Path:
    path = tmp_path / "app.db"
    with sqlite3.connect(path) as conn:
        conn.executescript(
            """
            CREATE TABLE place (id TEXT, slug TEXT, status TEXT, cover_photo_id TEXT);
            CREATE TABLE photo (
                id TEXT, place_id TEXT, status TEXT, caption TEXT, description_blocks TEXT,
                attribution_author TEXT, attribution_source_url TEXT, attribution_license TEXT,
                attribution_license_url TEXT, original_path TEXT, thumb_path TEXT
            );
            INSERT INTO place VALUES ('p', 'sample-place', 'published', 'cover');
            INSERT INTO photo VALUES
              ('cover', 'p', 'approved', 'Cover',
               '[{"type":"heading","text":"Cover heading"}]', 'Author', 'https://example.org',
               'CC BY', 'https://example.org/lic', 'a.jpg', 'thumb.jpg'),
              ('first', 'p', 'approved', 'Repeated',
               '[{"type":"heading","text":"First heading"}]', 'Author', 'https://example.org',
               'CC BY', 'https://example.org/lic', 'b.jpg', 'thumb2.jpg'),
              ('second', 'p', 'approved', 'Repeated',
               '[{"type":"heading","text":"Second heading"}]', 'Author', 'https://example.org',
               'CC BY', 'https://example.org/lic', 'c.jpg', 'thumb3.jpg'),
              ('protected', 'p', 'approved', NULL, '[]', NULL, NULL, NULL, NULL,
               'private.jpg', 'thumb4.jpg');
            """
        )
    return path


def plan() -> dict:
    return {
        "schema_version": 1,
        "kind": "photo_caption_curation",
        "edits": [
            {
                "photo_id": "first",
                "place_slug": "sample-place",
                "expected_caption": "Repeated",
                "expected_heading": "First heading",
                "new_caption": "First unique caption",
            },
            {
                "photo_id": "second",
                "place_slug": "sample-place",
                "expected_caption": "Repeated",
                "expected_heading": "Second heading",
                "new_caption": "Second unique caption",
            },
        ],
    }


def test_plan_validates_shape_and_caption_limit(tmp_path: Path) -> None:
    path = tmp_path / "plan.json"
    path.write_text(json.dumps(plan()), encoding="utf-8")
    assert len(load_plan(path)["edits"]) == 2
    data = plan()
    data["edits"][1]["photo_id"] = "first"
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError, match="Duplicate"):
        load_plan(path)
    data = plan()
    data["edits"][0]["new_caption"] = "A" * 121
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError, match="overlong"):
        load_plan(path)


def test_protected_photos_are_not_edited(tmp_path: Path) -> None:
    path = database(tmp_path)
    with open_readonly(path) as conn:
        report, protected = check_plan(conn, plan(), {"protected"})
    assert len(report) == 2
    assert len(protected) == 1
    assert report[0]["photo"]["caption"] == "Repeated"
    mutated = plan()
    mutated["edits"][0]["photo_id"] = "protected"
    with open_readonly(path) as conn:
        with pytest.raises(ValueError, match="protected"):
            check_plan(conn, mutated, {"protected"})


def test_stale_preconditions_prevent_all_writes(tmp_path: Path) -> None:
    path = database(tmp_path)
    data = plan()
    data["edits"][0]["expected_heading"] = "Wrong"
    with open_readonly(path) as conn:
        with pytest.raises(ValueError, match="Stale photo description"):
            check_plan(conn, data, {"protected"})
    with sqlite3.connect(path) as conn:
        caption = conn.execute("SELECT caption FROM photo WHERE id='first'").fetchone()[0]
    assert caption == "Repeated"


def test_cover_cannot_be_edited(tmp_path: Path) -> None:
    path = database(tmp_path)
    data = plan()
    data["edits"][0]["photo_id"] = "cover"
    with open_readonly(path) as conn:
        with pytest.raises(ValueError, match="cover photo"):
            check_plan(conn, data, {"protected"})


def test_preflight_detects_conflicting_target_caption(tmp_path: Path) -> None:
    path = database(tmp_path)
    data = plan()
    data["edits"][0]["new_caption"] = "Cover"
    with open_readonly(path) as conn:
        with pytest.raises(ValueError, match="duplicates"):
            check_plan(conn, data, {"protected"})


def test_exception_file_and_readonly_sqlite(tmp_path: Path) -> None:
    path = tmp_path / "exceptions.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "media_exceptions": [
                    {"photo_id": "protected", "reason": "At owner's request"},
                ],
            }
        ),
        encoding="utf-8",
    )
    assert protected_ids(path) == {"protected"}
    db = database(tmp_path)
    old = db.read_bytes()
    with open_readonly(db) as conn:
        assert repeated_count(conn) == 0  # Below the audit threshold of three.
        with pytest.raises(sqlite3.OperationalError, match="readonly"):
            conn.execute("UPDATE photo SET caption='changed'")
    assert db.read_bytes() == old
