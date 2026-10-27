#!/usr/bin/env python3
"""Read-only editorial audit of all published PhotoMap places and their photo texts."""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path


def normalize(value: str | None) -> str:
    return " ".join(re.findall(r"\w+", (value or "").casefold()))


def load_blocks(value: str | None) -> list[dict]:
    try:
        loaded = json.loads(value or "[]")
        return loaded if isinstance(loaded, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def audit(database: str) -> dict:
    path = Path(database).resolve()
    connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    issues: list[dict] = []
    place_results = []
    by_place: dict[str, list[dict]] = defaultdict(list)
    try:
        for row in connection.execute(
            "SELECT id,place_id,status,caption,description_blocks FROM photo"
        ):
            if row["status"] == "approved":
                by_place[row["place_id"]].append(dict(row))
        places = connection.execute(
            "SELECT id,slug,title,description,local_comment,article_blocks,status,cover_photo_id "
            "FROM place ORDER BY slug"
        ).fetchall()
        for place in places:
            if place["status"] != "published":
                continue
            blocks = load_blocks(place["article_blocks"])
            photos = by_place.get(place["id"], [])
            flags = []
            description = (place["description"] or "").strip()
            comment = (place["local_comment"] or "").strip()
            if not description:
                flags.append("missing_description")
            elif len(description) < 50:
                flags.append("very_short_description")
            if not comment:
                flags.append("missing_local_comment")
            if not blocks:
                flags.append("missing_article")
            if blocks and normalize(blocks[0].get("text")) == normalize(place["title"]):
                flags.append("article_first_heading_repeats_place_title")
            repeated = Counter(
                normalize(value)
                for value in [description, comment] + [str(b.get("text") or "") for b in blocks]
                if normalize(value)
            )
            if any(count > 1 for count in repeated.values()):
                flags.append("identical_text_repeated_in_place")
            cover = place["cover_photo_id"]
            if cover and cover not in {photo["id"] for photo in photos}:
                flags.append("cover_missing_from_approved_photos")
            if not photos:
                flags.append("no_approved_photos")
            caption_count = Counter(
                normalize(photo["caption"]) for photo in photos
                if normalize(photo["caption"])
            )
            same_captions = {caption: count for caption, count in caption_count.items() if count >= 3}
            if same_captions:
                flags.append("many_identical_photo_captions")
            low_value_keywords = r"\b(?:kamera|monitoring|cctv|wentylator|rura|ściana|sciana|reklama)\b"
            suspicious = []
            for photo in photos:
                text = " ".join([photo["caption"] or ""] + [
                    str(block.get("text") or "") for block in load_blocks(photo["description_blocks"])
                ])
                if re.search(low_value_keywords, text, re.IGNORECASE):
                    suspicious.append({"photo_id": photo["id"], "caption": photo["caption"], "text": text[:330]})
            if suspicious:
                flags.append("photos_with_questionable_subject_words")
            row = {
                "place_id": place["id"], "slug": place["slug"], "title": place["title"],
                "description": description, "local_comment": comment,
                "article_blocks": blocks, "approved_photo_count": len(photos),
                "flags": flags, "suspicious_photo_text": suspicious,
                "same_caption_groups": same_captions,
            }
            place_results.append(row)
            if flags:
                issues.append({"slug": place["slug"], "flags": flags})
        return {
            "places_audited": len(place_results),
            "issues_by_type": dict(Counter(f for p in place_results for f in p["flags"])),
            "flagged_places": issues,
            "places": place_results,
            "note": "Flags require human editorial validation. This script never changes the database.",
        }
    finally:
        connection.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--database", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    report = audit(args.database)
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"places_audited": report["places_audited"],
                      "issues_by_type": report["issues_by_type"],
                      "flagged_places": report["flagged_places"][:25]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
