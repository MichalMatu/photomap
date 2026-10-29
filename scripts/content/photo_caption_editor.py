#!/usr/bin/env python3
"""Apply a reviewed photo-caption plan via local admin API, with backup and audit.

Dry-run by default. Never edits photo files or any attribution/description fields.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


def normalize(value: str | None) -> str:
    return " ".join(re.findall(r"\w+", (value or "").casefold()))


def read_json(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object")
    return data


def load_plan(path: Path) -> dict:
    plan = read_json(path)
    if plan.get("schema_version") != 1 or plan.get("kind") != "photo_caption_curation":
        raise ValueError("Unexpected caption plan schema")
    edits = plan.get("edits")
    if not isinstance(edits, list) or not edits:
        raise ValueError("Empty caption plan")
    ids = set()
    for edit in edits:
        if not isinstance(edit, dict) or any(
            not isinstance(edit.get(field), str) or not edit[field].strip()
            for field in (
                "photo_id",
                "place_slug",
                "expected_caption",
                "expected_heading",
                "new_caption",
            )
        ):
            raise ValueError("Caption plan fields must be nonempty strings")
        if edit["photo_id"] in ids or len(edit["new_caption"]) > 120:
            raise ValueError("Duplicate photo ID or overlong caption")
        ids.add(edit["photo_id"])
    return plan


def protected_ids(path: Path) -> set[str]:
    data = read_json(path)
    if data.get("schema_version") != 1 or not isinstance(
        data.get("media_exceptions"), list
    ):
        raise ValueError("Invalid exception file")
    return {entry["photo_id"] for entry in data["media_exceptions"]}


def open_readonly(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def photo_row(conn: sqlite3.Connection, photo_id: str) -> dict | None:
    row = conn.execute(
        "SELECT p.*, pl.slug AS place_slug, pl.status AS place_status, "
        "pl.cover_photo_id FROM photo p JOIN place pl ON pl.id=p.place_id WHERE p.id=?",
        (photo_id,),
    ).fetchone()
    return dict(row) if row else None


def record_hash(row: dict) -> str:
    return hashlib.sha256(
        json.dumps(row, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def repeated_count(conn: sqlite3.Connection) -> int:
    grouped: dict[tuple[str, str], int] = Counter()
    for row in conn.execute(
        "SELECT p.caption, pl.slug FROM photo p JOIN place pl ON pl.id=p.place_id "
        "WHERE p.status='approved' AND pl.status='published'"
    ):
        if caption := normalize(row["caption"]):
            grouped[(row["slug"], caption)] += 1
    return sum(count >= 3 for count in grouped.values())


def check_plan(
    conn: sqlite3.Connection, plan: dict, exclusions: set[str]
) -> tuple[list[dict], dict]:
    edits = plan["edits"]
    if exclusions.intersection(edit["photo_id"] for edit in edits):
        raise ValueError("Caption plan contains a protected photo")
    protected_before = {}
    for photo_id in exclusions:
        row = photo_row(conn, photo_id)
        if row is None:
            raise ValueError("Protected photo no longer exists: " + photo_id)
        protected_before[photo_id] = record_hash(row)

    planned = {}
    rows = []
    for edit in edits:
        row = photo_row(conn, edit["photo_id"])
        if (
            row is None
            or row["status"] != "approved"
            or row["place_status"] != "published"
            or row["place_slug"] != edit["place_slug"]
            or row["id"] == row["cover_photo_id"]
        ):
            raise ValueError(
                "Missing/changed/unapproved/cover photo: " + edit["photo_id"]
            )
        if row["caption"] not in (edit["expected_caption"], edit["new_caption"]):
            raise ValueError("Stale caption: " + edit["photo_id"])
        blocks = json.loads(row["description_blocks"] or "[]")
        heading = next(
            (block.get("text") for block in blocks if block.get("type") == "heading"),
            None,
        )
        if heading != edit["expected_heading"]:
            raise ValueError("Stale photo description: " + edit["photo_id"])
        rows.append({"photo": row, "edit": edit})
        planned[row["id"]] = edit["new_caption"]

    existing: set[tuple[str, str]] = set()
    for row in conn.execute(
        "SELECT p.id, p.caption, pl.id AS place_id FROM photo p JOIN place pl ON p.place_id=pl.id "
        "WHERE p.status='approved' AND pl.status='published'"
    ):
        caption = normalize(planned.get(row["id"], row["caption"]))
        if not caption:
            continue
        key = (row["place_id"], caption)
        if row["id"] in planned and key in existing:
            raise ValueError("New caption duplicates an existing gallery caption")
        existing.add(key)
    return rows, protected_before


def admin_request(
    token: str, path: str, *, method: str = "GET", payload: dict | None = None
):
    request = Request(
        "http://127.0.0.1:8000" + path,
        data=json.dumps(payload, ensure_ascii=False).encode()
        if payload is not None
        else None,
        method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
        },
    )
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode())


def verify_api(rows: list[dict], token: str) -> None:
    by_place = {}
    for entry in rows:
        row, edit = entry["photo"], entry["edit"]
        place_id = row["place_id"]
        if place_id not in by_place:
            url = "/api/admin/places/" + quote(place_id, safe="") + "/photos"
            by_place[place_id] = {p["id"]: p for p in admin_request(token, url)}
        photo = by_place[place_id].get(row["id"])
        if (
            not photo
            or photo["caption"] != row["caption"]
            or photo["status"] != "approved"
        ):
            raise ValueError("Admin API differs from SQLite: " + edit["photo_id"])


def prepare_backup(
    db: Path, audit: Path, plan: dict, rows: list[dict], protected: dict
) -> None:
    audit.mkdir(parents=True, exist_ok=True)
    backup = audit / "app-before-captions.sqlite"
    manifest = audit / "before-and-plan.json"
    journal = audit / "changes.jsonl"
    if any(path.exists() for path in (backup, manifest, journal)):
        raise ValueError("Audit files already exist; never overwrite prior evidence")
    with manifest.open("x", encoding="utf-8") as handle:
        json.dump(
            {
                "plan": plan,
                "before": [entry["photo"] for entry in rows],
                "protected_record_hashes": protected,
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )
    source = sqlite3.connect(str(db))
    destination = sqlite3.connect(str(backup))
    try:
        source.backup(destination)
    finally:
        source.close()
        destination.close()
    with open_readonly(backup) as check:
        if check.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("SQLite backup integrity failed")


def append_journal(path: Path, entry: dict) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")


def execute(
    plan: dict, db: Path, audit: Path, exceptions: set[str], token: str
) -> dict:
    with open_readonly(db) as conn:
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("Production SQLite integrity failed")
        if repeated_count(conn) != 8:
            raise ValueError(
                "Expected exactly 8 repeated-caption groups; review a new plan"
            )
        rows, protected = check_plan(conn, plan, exceptions)
    verify_api(rows, token)
    prepare_backup(db, audit, plan, rows, protected)
    journal = audit / "changes.jsonl"
    written = 0
    for entry in rows:
        row, edit = entry["photo"], entry["edit"]
        if row["caption"] == edit["new_caption"]:
            continue
        url = "/api/admin/places/" + quote(row["place_id"], safe="") + "/photos"
        current = next(
            (p for p in admin_request(token, url) if p["id"] == row["id"]),
            None,
        )
        if current is None or current["caption"] != edit["expected_caption"]:
            raise ValueError("Concurrent caption change: " + row["id"])
        photo = admin_request(
            token,
            "/api/admin/photos/" + quote(row["id"], safe=""),
            method="PATCH",
            payload={"caption": edit["new_caption"]},
        )
        if photo["id"] != row["id"] or photo["caption"] != edit["new_caption"]:
            raise ValueError("Admin API postcondition failed: " + row["id"])
        append_journal(
            journal,
            {
                "photo_id": row["id"],
                "old": row["caption"],
                "new": edit["new_caption"],
                "status": "verified",
            },
        )
        written += 1

    with open_readonly(db) as conn:
        for entry in rows:
            before, edit = entry["photo"], entry["edit"]
            now = photo_row(conn, before["id"])
            if now is None or now["caption"] != edit["new_caption"]:
                raise ValueError("Persisted caption mismatch: " + before["id"])
            for field in (
                "description_blocks",
                "original_path",
                "thumb_path",
                "status",
                "attribution_author",
                "attribution_source_url",
                "attribution_license",
                "attribution_license_url",
            ):
                if now[field] != before[field]:
                    raise ValueError(
                        "Unexpected field change: " + before["id"] + " " + field
                    )
        for photo_id, original_hash in protected.items():
            now = photo_row(conn, photo_id)
            if now is None or record_hash(now) != original_hash:
                raise ValueError("User-protected photo changed: " + photo_id)
        remaining = repeated_count(conn)
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        if remaining != 0 or integrity != "ok":
            raise ValueError("Final quality or SQLite integrity check failed")
    result = {
        "updated": written,
        "repeated_groups_remaining": remaining,
        "protected_unchanged": len(protected),
        "integrity": integrity,
    }
    append_journal(journal, {"event": "postcheck", **result})
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--exceptions", type=Path, required=True)
    parser.add_argument("--audit-dir", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()
    plan = load_plan(args.plan)
    exclusions = protected_ids(args.exceptions)
    if plan.get("expected_pi_sha"):
        repo = args.database.resolve().parents[2]
        actual = subprocess.check_output(
            ["git", "-C", str(repo), "rev-parse", "HEAD"], text=True
        ).strip()
        if actual != plan["expected_pi_sha"]:
            raise ValueError("Production SHA differs from reviewed plan")
    with open_readonly(args.database) as conn:
        rows, protected = check_plan(conn, plan, exclusions)
        current_groups = repeated_count(conn)
    print(
        json.dumps(
            {
                "dry_run": not args.apply,
                "planned": len(rows),
                "protected": len(protected),
                "repeated_caption_groups": current_groups,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    if not args.apply:
        return 0
    if args.confirm != "APPLY_CAPTIONS":
        parser.error("Changes require --confirm APPLY_CAPTIONS")
    repo = args.database.resolve().parents[2]
    sys.path.insert(0, str(repo))
    from server import load_local_env

    load_local_env(repo / ".env")
    token = os.environ.get("ADMIN_TOKEN")
    if not token:
        raise ValueError("Admin token is missing")
    print(
        json.dumps(
            execute(plan, args.database, args.audit_dir, exclusions, token),
            ensure_ascii=False,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
