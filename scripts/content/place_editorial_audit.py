#!/usr/bin/env python3
"""Read-only editorial quality report for published PhotoMap places and photos.

This is a review aid, not an automatic content editor or media deletion tool.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path


BLOCKING_PLACE_FLAGS = frozenset(
    {
        "missing_description",
        "missing_local_comment",
        "missing_article",
        "no_approved_photos",
        "cover_missing_from_approved_photos",
        "missing_cover",
    }
)
BLOCKING_PHOTO_FLAGS = frozenset({"missing_caption", "incomplete_attribution"})


def normalize(value: str | None) -> str:
    return " ".join(re.findall(r"\w+", (value or "").casefold()))


def load_blocks(value: str | None) -> list[dict]:
    try:
        loaded = json.loads(value or "[]")
    except (TypeError, ValueError):
        return []
    return (
        [block for block in loaded if isinstance(block, dict)]
        if isinstance(loaded, list)
        else []
    )


def load_exceptions(path: str | None) -> dict[str, str]:
    if not path:
        return {}
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("schema_version") != 1:
        raise ValueError("Unsupported editorial exception schema")
    entries = data.get("media_exceptions")
    if not isinstance(entries, list):
        raise ValueError("media_exceptions must be a list")
    exceptions = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Each media exception must be an object")
        photo_id, reason = entry.get("photo_id"), entry.get("reason")
        if not isinstance(photo_id, str) or not photo_id.strip():
            raise ValueError("Media exception requires photo_id")
        if not isinstance(reason, str) or not reason.strip():
            raise ValueError("Media exception requires a nonempty reason")
        if photo_id in exceptions:
            raise ValueError("Duplicate media exception: " + photo_id)
        exceptions[photo_id] = reason
    return exceptions


def audit(database: str, *, exceptions: dict[str, str] | None = None) -> dict:
    exceptions = exceptions or {}
    path = Path(database).resolve()
    connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    by_place: dict[str, list[dict]] = defaultdict(list)
    place_results = []
    photo_issues = []
    seen_exception_ids: set[str] = set()
    missing_photo_descriptions = 0
    try:
        photos = connection.execute(
            "SELECT id, place_id, status, caption, description_blocks, "
            "attribution_author, attribution_source_url, attribution_license, "
            "attribution_license_url FROM photo"
        )
        for row in photos:
            if row["status"] == "approved":
                by_place[row["place_id"]].append(dict(row))

        places = connection.execute(
            "SELECT id, slug, title, description, local_comment, article_blocks, "
            "status, cover_photo_id FROM place ORDER BY slug"
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
                for value in [description, comment]
                + [str(block.get("text") or "") for block in blocks]
                if normalize(value)
            )
            if any(count > 1 for count in repeated.values()):
                flags.append("identical_text_repeated_in_place")
            cover = place["cover_photo_id"]
            approved_ids = {photo["id"] for photo in photos}
            if not cover:
                flags.append("missing_cover")
            elif cover not in approved_ids:
                flags.append("cover_missing_from_approved_photos")
            if not photos:
                flags.append("no_approved_photos")
            caption_count = Counter(
                normalize(photo["caption"])
                for photo in photos
                if normalize(photo["caption"])
            )
            repeated_captions = {
                caption: count for caption, count in caption_count.items() if count >= 3
            }
            if repeated_captions:
                flags.append("many_identical_photo_captions")
            suspicious = []
            for photo in photos:
                photo_id = photo["id"]
                if not load_blocks(photo["description_blocks"]):
                    missing_photo_descriptions += 1
                issues = []
                if not normalize(photo["caption"]):
                    issues.append("missing_caption")
                missing_attribution_fields = [
                    field
                    for field in (
                        "attribution_author",
                        "attribution_source_url",
                        "attribution_license",
                        "attribution_license_url",
                    )
                    if not (photo[field] or "").strip()
                ]
                if missing_attribution_fields:
                    issues.append("incomplete_attribution")
                if photo_id in exceptions:
                    seen_exception_ids.add(photo_id)
                for issue in issues:
                    photo_issues.append(
                        {
                            "photo_id": photo_id,
                            "place_slug": place["slug"],
                            "flag": issue,
                            "accepted_exception": photo_id in exceptions,
                            "reason": exceptions.get(photo_id),
                            "missing_fields": missing_attribution_fields
                            if issue == "incomplete_attribution"
                            else [],
                        }
                    )
                photo_text = " ".join(
                    [photo["caption"] or ""]
                    + [
                        str(b.get("text") or "")
                        for b in load_blocks(photo["description_blocks"])
                    ]
                )
                if re.search(
                    r"\b(?:kamera|monitoring|cctv|wentylator|rura|ściana|sciana|reklama)\b",
                    photo_text,
                    re.IGNORECASE,
                ):
                    suspicious.append(
                        {
                            "photo_id": photo_id,
                            "caption": photo["caption"],
                            "text": photo_text[:330],
                        }
                    )
            if suspicious:
                flags.append("photos_with_questionable_subject_words")
            place_results.append(
                {
                    "place_id": place["id"],
                    "slug": place["slug"],
                    "title": place["title"],
                    "approved_photo_count": len(photos),
                    "flags": flags,
                    "same_caption_groups": repeated_captions,
                    "suspicious_photo_text": suspicious,
                }
            )

        unmatched = sorted(set(exceptions) - seen_exception_ids)
        blocking_places = [
            {"slug": place["slug"], "flag": flag}
            for place in place_results
            for flag in place["flags"]
            if flag in BLOCKING_PLACE_FLAGS
        ]
        blocking_photos = [
            issue
            for issue in photo_issues
            if issue["flag"] in BLOCKING_PHOTO_FLAGS and not issue["accepted_exception"]
        ]
        return {
            "places_audited": len(place_results),
            "approved_photos_audited": sum(
                p["approved_photo_count"] for p in place_results
            ),
            "place_issues_by_type": dict(
                Counter(f for p in place_results for f in p["flags"])
            ),
            "photo_issues_by_type": dict(Counter(p["flag"] for p in photo_issues)),
            "optional_photo_descriptions_missing": missing_photo_descriptions,
            "blocking_issue_count": len(blocking_places)
            + len(blocking_photos)
            + len(unmatched),
            "blocking_place_issues": blocking_places,
            "blocking_photo_issues": blocking_photos,
            "accepted_photo_issues": [
                p for p in photo_issues if p["accepted_exception"]
            ],
            "unmatched_exceptions": unmatched,
            "places": place_results,
            "photo_issues": photo_issues,
            "note": "Exception means 'leave unchanged', not verified authorship or licensing. "
            "Heuristic warnings and optional photo descriptions do not fail --strict.",
        }
    finally:
        connection.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--exceptions", help="Versioned list of explicitly accepted media omissions"
    )
    parser.add_argument(
        "--strict", action="store_true", help="Fail on unresolved blocking issues"
    )
    args = parser.parse_args()
    report = audit(args.database, exceptions=load_exceptions(args.exceptions))
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                key: report[key]
                for key in (
                    "places_audited",
                    "approved_photos_audited",
                    "blocking_issue_count",
                    "place_issues_by_type",
                    "photo_issues_by_type",
                    "optional_photo_descriptions_missing",
                    "unmatched_exceptions",
                )
            },
            ensure_ascii=False,
        )
    )
    return int(args.strict and report["blocking_issue_count"] > 0)


if __name__ == "__main__":
    raise SystemExit(main())
