#!/usr/bin/env python3
"""Auditable editorial edits for PhotoMap photo text; no direct DB mutations."""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen


def normalized(value: str | None) -> str:
    return " ".join(re.findall(r"\w+", (value or "").casefold()))


def read_json(path: str) -> dict:
    with Path(path).open(encoding="utf-8") as source:
        return json.load(source)


def write_json(path: str, data: dict) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as destination:
        json.dump(data, destination, ensure_ascii=False, indent=2)
        destination.write("\n")


def export_snapshot(database: str) -> dict:
    db_path = Path(database).resolve()
    connection = sqlite3.connect(db_path.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        query = """
            SELECT p.id, p.place_id, pl.slug AS place_slug, pl.title AS place_title,
                   p.status, p.role, p.source, p.caption, p.description_blocks,
                   p.attribution_author, p.attribution_source_url,
                   p.attribution_license, p.attribution_license_url,
                   p.thumb_path, (p.id = pl.cover_photo_id) AS is_cover
            FROM photo p JOIN place pl ON pl.id = p.place_id
            ORDER BY pl.slug, p.created_at, p.id
        """
        photos = []
        for row in connection.execute(query):
            photo = dict(row)
            photo["description_blocks"] = json.loads(photo["description_blocks"] or "[]")
            photo["is_cover"] = bool(photo["is_cover"])
            photos.append(photo)
        return {
            "schema_version": 1,
            "exported_at": datetime.now(UTC).isoformat(),
            "photos": photos,
        }
    finally:
        connection.close()


def canonical_blocks(blocks: list[dict]) -> list[dict]:
    """API ContentBlock may include url=null; SQLite storage omits it."""
    return [
        {key: value for key, value in block.items() if key in ("type", "text", "url") and value is not None}
        for block in blocks
    ]


def is_repeated_first_heading(photo: dict) -> bool:
    blocks = photo.get("description_blocks") or []
    caption = normalized(photo.get("caption"))
    return bool(
        caption
        and blocks
        and blocks[0].get("type") in ("heading", "subheading")
        and normalized(blocks[0].get("text")) == caption
    )


def audit_snapshot(snapshot: dict) -> dict:
    totals = Counter()
    by_place: dict[str, Counter] = {}
    for photo in snapshot["photos"]:
        if photo["status"] != "approved":
            continue
        totals["approved"] += 1
        slug = photo["place_slug"]
        item = by_place.setdefault(slug, Counter())
        item["photos"] += 1
        if photo["is_cover"]:
            item["covers"] += 1
        if is_repeated_first_heading(photo):
            totals["caption_repeated_as_first_heading"] += 1
            item["repeated_headings"] += 1
        if not photo.get("caption"):
            totals["missing_caption"] += 1
        if not photo.get("description_blocks"):
            totals["missing_description"] += 1
        if not (photo.get("attribution_license") and photo.get("attribution_source_url")):
            totals["missing_license_or_source"] += 1
    albums = [
        {"place_slug": slug, **counts}
        for slug, counts in sorted(by_place.items(), key=lambda item: (-item[1]["photos"], item[0]))
    ]
    return {"counts": dict(totals), "albums": albums}


def make_plan(snapshot: dict) -> dict:
    edits = []
    skipped_heading_only = []
    for photo in snapshot["photos"]:
        if photo["status"] != "approved" or not is_repeated_first_heading(photo):
            continue
        blocks = photo["description_blocks"]
        if len(blocks) < 2:
            skipped_heading_only.append(photo["id"])
            continue
        edits.append({
            "photo_id": photo["id"],
            "place_id": photo["place_id"],
            "place_slug": photo["place_slug"],
            "reason": "caption_repeated_as_first_heading",
            "expected_caption": photo["caption"],
            "expected_description_blocks": blocks,
            "new_description_blocks": blocks[1:],
        })
    return {
        "schema_version": 1,
        "source_exported_at": snapshot.get("exported_at"),
        "edits": edits,
        "requires_manual_review": skipped_heading_only,
    }


def api_json(base_url: str, token: str, path: str, method: str = "GET", body: dict | None = None):
    url = base_url.rstrip("/") + path
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    request = Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError) as exc:
        raise RuntimeError("Admin API request failed: " + method + " " + path) from exc


def apply_plan(plan: dict, *, base_url: str, token: str, offset: int, batch_size: int, log_path: str) -> dict:
    parsed = urlsplit(base_url)
    if parsed.scheme != "https" and not (
        parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1", "::1")
    ):
        raise ValueError("Admin API URL must use HTTPS or local-loopback HTTP")
    if not 1 <= batch_size <= 100 or offset < 0:
        raise ValueError("batch-size must be 1..100 and offset must be nonnegative")
    edits = plan["edits"][offset:offset + batch_size]
    if not edits:
        return {"selected": 0, "updated": 0, "already_applied": 0}

    albums = {}
    checked = []
    for edit in edits:
        place_id = edit["place_id"]
        if place_id not in albums:
            path = "/api/admin/places/" + quote(place_id, safe="") + "/photos"
            albums[place_id] = {p["id"]: p for p in api_json(base_url, token, path)}
        photo = albums[place_id].get(edit["photo_id"])
        if photo is None:
            raise RuntimeError("Photo missing from admin API: " + edit["photo_id"])
        if (photo["caption"] == edit["expected_caption"] and
            canonical_blocks(photo["description_blocks"]) == canonical_blocks(edit["new_description_blocks"])):
            checked.append((edit, True))
        elif (
            photo["caption"] == edit["expected_caption"]
            and canonical_blocks(photo["description_blocks"]) == canonical_blocks(edit["expected_description_blocks"])
        ):
            checked.append((edit, False))
        else:
            raise RuntimeError("Stale edit; aborting batch before mutation: " + edit["photo_id"])

    log_file = Path(log_path)
    log_file.parent.mkdir(parents=True, exist_ok=True)
    updated = 0
    with log_file.open("a", encoding="utf-8") as log:
        for edit, already_applied in checked:
            if already_applied:
                continue
            path = "/api/admin/photos/" + quote(edit["photo_id"], safe="")
            api_json(
                base_url, token, path, method="PATCH",
                body={"description_blocks": edit["new_description_blocks"]},
            )
            record = {
                "edited_at": datetime.now(UTC).isoformat(),
                "photo_id": edit["photo_id"],
                "place_slug": edit["place_slug"],
                "old_description_blocks": edit["expected_description_blocks"],
                "new_description_blocks": edit["new_description_blocks"],
            }
            log.write(json.dumps(record, ensure_ascii=False) + "\n")
            log.flush()
            updated += 1
    return {"selected": len(edits), "updated": updated, "already_applied": len(edits) - updated}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="action", required=True)
    export = subparsers.add_parser("export", help="Read-only SQLite metadata export as JSON")
    export.add_argument("--database", required=True)
    export.add_argument("--output")
    audit = subparsers.add_parser("audit", help="Analyze saved photo metadata on Mac")
    audit.add_argument("--snapshot", required=True)
    audit.add_argument("--output")
    plan = subparsers.add_parser("plan", help="Prepare reversible duplicate-heading changes")
    plan.add_argument("--snapshot", required=True)
    plan.add_argument("--output", required=True)
    apply = subparsers.add_parser("apply", help="Explicit, precondition-checked admin API updates")
    apply.add_argument("--plan", required=True)
    apply.add_argument("--base-url", default="https://photomap.pl")
    apply.add_argument("--token-env", default="PHOTOMAP_ADMIN_TOKEN")
    apply.add_argument("--offset", type=int, default=0)
    apply.add_argument("--batch-size", type=int, default=25)
    apply.add_argument("--execute", action="store_true")
    apply.add_argument("--confirm", default="")
    apply.add_argument("--backup-path")
    apply.add_argument("--log")
    args = parser.parse_args()

    if args.action == "export":
        data = export_snapshot(args.database)
        if args.output:
            write_json(args.output, data)
        else:
            json.dump(data, sys.stdout, ensure_ascii=False)
            sys.stdout.write("\n")
        return

    if args.action in ("audit", "plan"):
        snapshot = read_json(args.snapshot)
        if snapshot.get("schema_version") != 1:
            parser.error("Unsupported snapshot format")
        data = audit_snapshot(snapshot) if args.action == "audit" else make_plan(snapshot)
        if args.action == "plan" or args.output:
            write_json(args.output, data)
        else:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    edit_plan = read_json(args.plan)
    if edit_plan.get("schema_version") != 1:
        parser.error("Unsupported edit plan format")
    selected = edit_plan["edits"][args.offset:args.offset + args.batch_size]
    if not args.execute:
        print(json.dumps({"dry_run": True, "selected": len(selected), "offset": args.offset}))
        return
    if args.confirm != "APPLY" or not args.backup_path or not Path(args.backup_path).is_file() or not args.log:
        parser.error("Execution requires --confirm APPLY, an existing --backup-path and --log")
    token = os.environ.get(args.token_env)
    if not token:
        parser.error("Admin token environment variable is missing")
    print(json.dumps(apply_plan(
        edit_plan, base_url=args.base_url, token=token,
        offset=args.offset, batch_size=args.batch_size, log_path=args.log,
    )))


if __name__ == "__main__":
    main()
