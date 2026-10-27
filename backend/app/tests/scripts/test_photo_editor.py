from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "scripts" / "content"))

from photo_editor import apply_plan, audit_snapshot, canonical_blocks, make_plan  # noqa: E402


def photo(
    photo_id: str,
    *,
    caption: str = "Złoty Pies w śnieżnej zawiei",
    blocks: list[dict] | None = None,
) -> dict:
    return {
        "id": photo_id,
        "place_id": "place-1",
        "place_slug": "rynek-wroclaw",
        "status": "approved",
        "caption": caption,
        "description_blocks": (
            blocks if blocks is not None else [
                {"type": "heading", "text": caption},
                {"type": "paragraph", "text": "Śnieg na elewacji przy Rynku."},
            ]
        ),
        "is_cover": photo_id == "1",
        "attribution_license": "CC BY-SA 4.0",
        "attribution_source_url": "https://example.org/media",
    }


def test_audit_and_plan_remove_only_exact_repeated_heading() -> None:
    snapshot = {
        "schema_version": 1,
        "photos": [
            photo("1"),
            photo("2", blocks=[{"type": "heading", "text": "Złoty Pies w śnieżnej zawiei"}]),
            photo("3", blocks=[{"type": "heading", "text": "Inny nagłówek"}]),
        ],
    }
    report = audit_snapshot(snapshot)
    assert report["counts"]["approved"] == 3
    assert report["counts"]["caption_repeated_as_first_heading"] == 2
    assert report["albums"][0]["covers"] == 1
    plan = make_plan(snapshot)
    assert len(plan["edits"]) == 1
    assert plan["edits"][0]["photo_id"] == "1"
    assert plan["edits"][0]["new_description_blocks"] == [
        {"type": "paragraph", "text": "Śnieg na elewacji przy Rynku."},
    ]
    assert plan["requires_manual_review"] == ["2"]


def test_block_comparison_ignores_api_null_url() -> None:
    assert canonical_blocks([{"type": "paragraph", "text": "Tekst", "url": None}]) == [
        {"type": "paragraph", "text": "Tekst"},
    ]


def test_apply_checks_all_before_first_write(tmp_path: Path) -> None:
    plan = make_plan({"schema_version": 1, "photos": [photo("1"), photo("2")]})
    calls = []

    def fake_api(_base_url, _token, path, method="GET", body=None):
        calls.append((method, path, body))
        if method == "GET":
            return [
                {
                    "id": "1",
                    "caption": "Złoty Pies w śnieżnej zawiei",
                    "description_blocks": [
                        {"type": "heading", "text": "Złoty Pies w śnieżnej zawiei", "url": None},
                        {"type": "paragraph", "text": "Śnieg na elewacji przy Rynku.", "url": None},
                    ],
                },
                {"id": "2", "caption": "Zmieniony", "description_blocks": []},
            ]
        return {"id": "1"}

    with patch("photo_editor.api_json", side_effect=fake_api):
        with pytest.raises(RuntimeError, match="Stale edit"):
            apply_plan(
                plan,
                base_url="https://photomap.pl",
                token="test",
                offset=0,
                batch_size=25,
                log_path=str(tmp_path / "changes.jsonl"),
            )
    assert not [call for call in calls if call[0] == "PATCH"]


def test_apply_is_idempotent_and_logs_old_text(tmp_path: Path) -> None:
    plan = make_plan({"schema_version": 1, "photos": [photo("1")]})
    requests = []
    current = {
        "id": "1",
        "caption": "Złoty Pies w śnieżnej zawiei",
        "description_blocks": [
            {"type": "heading", "text": "Złoty Pies w śnieżnej zawiei", "url": None},
            {"type": "paragraph", "text": "Śnieg na elewacji przy Rynku.", "url": None},
        ],
    }

    def fake_api(_base_url, _token, path, method="GET", body=None):
        requests.append(method)
        if method == "GET":
            return [current]
        current["description_blocks"] = body["description_blocks"]
        return current

    log = tmp_path / "changes.jsonl"
    with patch("photo_editor.api_json", side_effect=fake_api):
        first = apply_plan(
            plan,
            base_url="https://photomap.pl",
            token="test",
            offset=0,
            batch_size=25,
            log_path=str(log),
        )
        second = apply_plan(
            plan,
            base_url="https://photomap.pl",
            token="test",
            offset=0,
            batch_size=25,
            log_path=str(log),
        )
    assert first["updated"] == 1
    assert second["already_applied"] == 1
    assert requests.count("PATCH") == 1
    assert json.loads(log.read_text(encoding="utf-8"))["old_description_blocks"][0]["type"] == "heading"
