#!/usr/bin/env python3
"""Permanently prune manually rejected and explicitly selected PhotoMap photos.

Uses the existing admin API (not direct SQL writes). Dry run by default.
A small durable decision log is retained. No local SQLite/media backup is
created by this script; take a single consistent backup after editorial cleanup.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path.cwd()


def database_connection(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return connection


def select_targets(db: sqlite3.Connection, curated: dict) -> list[dict]:
    chosen = {}
    for photo in curated["photos"]:
        photo_id = photo["photo_id"]
        if photo_id in chosen:
            raise ValueError("Duplicate manual photo ID")
        chosen[photo_id] = {
            "id": photo_id,
            "reason": photo["reason"],
            "label": photo["label"],
            "expected_slug": photo["place_slug"],
            "selection": "visual_review",
        }
    rejected = db.execute("SELECT id FROM photo WHERE status='rejected' ORDER BY id").fetchall()
    for row in rejected:
        chosen.setdefault(row["id"], {
            "id": row["id"],
            "reason": "Previously rejected; remove permanently",
            "label": None,
            "expected_slug": None,
            "selection": "previously_rejected",
        })

    results = []
    for photo_id, target in chosen.items():
        row = db.execute(
            """SELECT p.id, p.place_id, p.status, p.caption, p.original_path,
                      p.public_path, p.thumb_path, p.audio_original_path,
                      p.audio_public_path, pl.slug, pl.cover_photo_id
               FROM photo p JOIN place pl ON pl.id=p.place_id WHERE p.id=?""",
            (photo_id,),
        ).fetchone()
        if row is None:
            if target["selection"] == "visual_review":
                raise RuntimeError("Selected photo no longer exists: " + photo_id)
            continue
        if target["expected_slug"] and row["slug"] != target["expected_slug"]:
            raise RuntimeError("Photo is attached to an unexpected place: " + photo_id)
        if target["selection"] == "visual_review" and row["status"] != "approved":
            raise RuntimeError("Visual selection has unexpected status: " + photo_id)
        if target["selection"] == "previously_rejected" and row["status"] != "rejected":
            raise RuntimeError("Old rejected photo changed status: " + photo_id)
        if row["cover_photo_id"] == photo_id:
            raise RuntimeError("Refusing to delete place cover: " + photo_id)
        if row["status"] == "approved":
            count = db.execute(
                "SELECT count(*) FROM photo WHERE place_id=? AND status='approved'",
                (row["place_id"],),
            ).fetchone()[0]
            if count <= 1:
                raise RuntimeError("Refusing to remove final approved photo of place: " + photo_id)
        results.append({**target, "before": dict(row)})
    return results


def get_token() -> str:
    sys.path.insert(0, str(ROOT))
    import server
    server.load_local_env()
    token = os.getenv("ADMIN_TOKEN")
    if not token:
        raise RuntimeError("ADMIN_TOKEN not found on host")
    return token


def delete_by_api(base_url: str, token: str, photo_id: str) -> None:
    request = Request(
        base_url.rstrip("/") + "/api/admin/photos/" + quote(photo_id, safe=""),
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
        method="DELETE",
    )
    try:
        with urlopen(request, timeout=40) as response:
            if response.status != 204:
                raise RuntimeError("Unexpected admin response for " + photo_id)
    except HTTPError as exc:
        raise RuntimeError("Admin DELETE failed for " + photo_id + ": HTTP " + str(exc.code)) from exc


def run(args: argparse.Namespace) -> None:
    db_path = Path(args.database)
    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    if plan.get("schema_version") != 1:
        raise ValueError("Unexpected curation plan version")
    if args.base_url not in ("http://127.0.0.1:8000", "http://localhost:8000"):
        raise ValueError("Admin API must be a local loopback URL")

    with database_connection(db_path) as db:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("SQLite integrity check failed before deletion")
        before = dict(db.execute("SELECT status,count(*) FROM photo GROUP BY status"))
        inconsistent = db.execute(
            """SELECT count(*) FROM place p WHERE p.photo_count !=
               (SELECT count(*) FROM photo f WHERE f.place_id=p.id AND f.status='approved')"""
        ).fetchone()[0]
        stale = db.execute(
            """SELECT count(*) FROM place p LEFT JOIN photo f ON f.id=p.cover_photo_id
               WHERE p.cover_photo_id IS NOT NULL
                 AND (f.id IS NULL OR f.status!='approved')"""
        ).fetchone()[0]
        if inconsistent or stale:
            raise RuntimeError(f"Pre-existing data inconsistencies: counts={inconsistent}, covers={stale}")
        targets = select_targets(db, plan)
        affected_places = sorted({x["before"]["place_id"] for x in targets})
        print(json.dumps({
            "action": "dry-run" if not args.execute else "delete",
            "total": len(targets),
            "manual_selections": sum(x["selection"] == "visual_review" for x in targets),
            "previously_rejected": sum(x["selection"] == "previously_rejected" for x in targets),
            "before": before,
            "affected_places": len(affected_places),
        }), flush=True)
        if not args.execute:
            return

        if args.confirm != "PERMANENT_DELETE":
            raise ValueError("Requires --confirm PERMANENT_DELETE")
        # Persist a small audit trail, not another SQLite or media copy.
        audit_dir = Path(args.audit_dir).resolve()
        if audit_dir.exists():
            raise RuntimeError("Audit directory already exists; use a new batch ID")
        audit_dir.mkdir(parents=True, exist_ok=False)

        manifest = {
            "created_at": datetime.now(UTC).isoformat(),
            "policy": "permanent removal of rejected/low-quality media",
            "backup_policy": "No per-batch backup; one verified off-Pi snapshot after final cleanup",
            "before": before,
            "targets": targets,
        }
        with (audit_dir / "manifest.json").open("x", encoding="utf-8") as manifest_file:
            json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
            manifest_file.write("\n")
            manifest_file.flush()
            os.fsync(manifest_file.fileno())
        token = get_token()
        log_path = audit_dir / "deleted.jsonl"
        for target in targets:
            pid = target["id"]
            fresh = db.execute("SELECT status FROM photo WHERE id=?", (pid,)).fetchone()
            if fresh is None or fresh["status"] != target["before"]["status"]:
                raise RuntimeError("Concurrent change of photo; stop batch: " + pid)
            delete_by_api(args.base_url, token, pid)
            if db.execute("SELECT id FROM photo WHERE id=?", (pid,)).fetchone():
                raise RuntimeError("Photo still in database after admin DELETE: " + pid)
            with log_path.open("a", encoding="utf-8") as log:
                log.write(json.dumps({
                    "photo_id": pid,
                    "place_slug": target["before"]["slug"],
                    "selection": target["selection"],
                    "reason": target["reason"],
                    "deleted_at": datetime.now(UTC).isoformat(),
                }, ensure_ascii=False) + "\n")
                log.flush()
                os.fsync(log.fileno())
            print("DELETED", target["label"] or "rejected", target["before"]["slug"], pid, flush=True)

    with database_connection(db_path) as after_db:
        after = dict(after_db.execute("SELECT status,count(*) FROM photo GROUP BY status"))
        if after_db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("SQLite integrity check failed after pruning")
        remaining = after_db.execute("SELECT count(*) FROM photo WHERE status='rejected'").fetchone()[0]
        stale_covers = after_db.execute(
            """SELECT count(*) FROM place p
               LEFT JOIN photo f ON f.id=p.cover_photo_id
               WHERE p.cover_photo_id IS NOT NULL
                 AND (f.id IS NULL OR f.status!='approved')"""
        ).fetchone()[0]
        discrepancies = after_db.execute(
            """SELECT count(*) FROM place p WHERE p.photo_count !=
               (SELECT count(*) FROM photo f WHERE f.place_id=p.id AND f.status='approved')"""
        ).fetchone()[0]
        if remaining or stale_covers or discrepancies:
            raise RuntimeError(
                f"Post-check failed: rejected={remaining}, stale_covers={stale_covers}, photo_count_errors={discrepancies}"
            )
        expected = dict(before)
        expected["approved"] = before.get("approved", 0) - len([p for p in targets if p["before"]["status"]=="approved"])
        expected["rejected"] = before.get("rejected", 0) - len([p for p in targets if p["before"]["status"]=="rejected"])
        expected = {k:v for k,v in expected.items() if v}
        if after != expected:
            raise RuntimeError(f"Photo counts differ after deletion: expected={expected}, actual={after}")
        if len(log_path.read_text(encoding="utf-8").splitlines()) != len(targets):
            raise RuntimeError("Deletion audit log incomplete")
        summary = {"status":"verified", "deleted":len(targets), "before":before, "after":after,
                   "stale_covers":stale_covers,"place_photo_count_discrepancies":discrepancies}
        (audit_dir / "result.json").write_text(json.dumps(summary, indent=2)+"\n", encoding="utf-8")
        print("PHOTO_PRUNE_VERIFIED", json.dumps(summary), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--audit-dir", required=True, help="Unique directory for JSON audit only; no database or media backup")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm", default="")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
