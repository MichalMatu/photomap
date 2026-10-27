from __future__ import annotations

import sqlite3
import sys
import json
from argparse import Namespace
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "scripts" / "content"))
from photo_prune import run, select_targets  # noqa: E402


def db_for_review() -> sqlite3.Connection:
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE place (id TEXT PRIMARY KEY, slug TEXT, cover_photo_id TEXT, photo_count INTEGER);
        CREATE TABLE photo (
            id TEXT PRIMARY KEY, place_id TEXT, status TEXT, caption TEXT,
            original_path TEXT, public_path TEXT, thumb_path TEXT,
            audio_original_path TEXT, audio_public_path TEXT
        );
        INSERT INTO place VALUES ('place1','dworzec-glowny','cover',2);
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


def test_refuses_removal_of_all_approved_photos_in_one_batch() -> None:
    db = db_for_review()
    db.execute("UPDATE place SET cover_photo_id=NULL WHERE id='place1'")
    plan_for_both = {"photos": [
        {"photo_id": "cover", "place_slug": "dworzec-glowny",
         "reason": "reviewed", "label": "F0000"},
        {"photo_id": "bad", "place_slug": "dworzec-glowny",
         "reason": "reviewed", "label": "F0001"},
    ]}
    with pytest.raises(RuntimeError, match="all approved"):
        select_targets(db, plan_for_both)


def test_pruning_writes_only_small_audit_not_sqlite_backup(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    import photo_prune

    disk = tmp_path / "app.db"
    memory = db_for_review()
    connection = sqlite3.connect(disk)
    memory.backup(connection)
    connection.commit()
    connection.close()
    memory.close()

    plan_file = tmp_path / "curation.json"
    plan_file.write_text(json.dumps(plan()), encoding="utf-8")
    audit_dir = tmp_path / "logs"
    args = Namespace(
        database=str(disk), plan=str(plan_file), audit_dir=str(audit_dir),
        base_url="http://127.0.0.1:8000",
        execute=True, confirm="PERMANENT_DELETE",
    )

    def fake_api(_url: str, _token: str, photo_id: str) -> None:
        with sqlite3.connect(disk) as db:
            row = db.execute("SELECT status FROM photo WHERE id=?", (photo_id,)).fetchone()
            assert row is not None
            if row[0] == "approved":
                db.execute("UPDATE place SET photo_count=photo_count-1 WHERE id='place1'")
            db.execute("DELETE FROM photo WHERE id=?", (photo_id,))

    monkeypatch.setattr(photo_prune, "get_token", lambda: "test-token")
    monkeypatch.setattr(photo_prune, "delete_by_api", fake_api)
    run(args)

    assert len((audit_dir / "deleted.jsonl").read_text(encoding="utf-8").splitlines()) == 2
    assert json.loads((audit_dir / "result.json").read_text())["after"] == {"approved": 1}
    assert not list(audit_dir.rglob("*.db"))
    assert not list(audit_dir.rglob("*.sqlite"))
    assert sorted(path.name for path in audit_dir.iterdir()) == [
        "deleted.jsonl", "manifest.json", "result.json"
    ]
