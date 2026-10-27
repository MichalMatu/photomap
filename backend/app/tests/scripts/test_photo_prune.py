from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "scripts" / "content"))
from photo_prune import select_targets  # noqa: E402


def db_for_review() -> sqlite3.Connection:
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE place (id TEXT PRIMARY KEY, slug TEXT, cover_photo_id TEXT);
        CREATE TABLE photo (
            id TEXT PRIMARY KEY, place_id TEXT, status TEXT, caption TEXT,
            original_path TEXT, public_path TEXT, thumb_path TEXT,
            audio_original_path TEXT, audio_public_path TEXT
        );
        INSERT INTO place VALUES ('place1','dworzec-glowny','cover');
        INSERT INTO photo VALUES ('cover','place1','approved','Cover','/c',NULL,NULL,NULL,NULL);
        INSERT INTO photo VALUES ('bad','place1','approved','Bad shot','/b',NULL,NULL,NULL,NULL);
        INSERT INTO photo VALUES ('old','place1','rejected','Old rejection','/o',NULL,NULL,NULL,NULL);
        """
    )
    return db


def plan(photo_id: str = "bad") -> dict:
    return {"schema_version": 1, "photos": [
        {"photo_id": photo_id, "place_slug": "dworzec-glowny",
         "reason": "reviewed as irrelevant", "label": "F0001"}
    ]}


def test_selects_both_old_rejections_and_curated_photo() -> None:
    db = db_for_review()
    results = select_targets(db, plan())
    assert len(results) == 2
    assert {r["id"] for r in results} == {"old", "bad"}
    assert results[0]["selection"] == "visual_review"
    assert results[1]["selection"] == "previously_rejected"


def test_never_deletes_cover() -> None:
    db = db_for_review()
    with pytest.raises(RuntimeError, match="cover"):
        select_targets(db, plan("cover"))


def test_refuses_stale_curated_photo_status() -> None:
    db = db_for_review()
    db.execute("UPDATE photo SET status='rejected' WHERE id='bad'")
    with pytest.raises(RuntimeError, match="unexpected status"):
        select_targets(db, plan())


def test_refuses_wrong_place() -> None:
    db = db_for_review()
    wrong = plan()
    wrong["photos"][0]["place_slug"] = "rynek-wroclaw"
    with pytest.raises(RuntimeError, match="unexpected place"):
        select_targets(db, wrong)
