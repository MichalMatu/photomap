#!/usr/bin/env python3
"""Generate a human-reviewable visual quality audit of existing PhotoMap photos.

Read-only for images and SQLite. Never treats heuristics as delete decisions.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat


SUSPICIOUS = re.compile(
    r"\b(?:kamer(?:a|y|ę|e)|monitoring|cctv|fragment(?:u|em)?\s+ściany|"
    r"fragment(?:u|em)?\s+sciany|ścian(?:a|y|ę|ie)|scian(?:a|y|e|ie)|"
    r"wentylacj(?:a|i|ę)|rura|rur(?:y|ę)|klimatyzator|"
    r"sam(?:a|o|e)\s+drzwi|reklam(?:a|y|ę)|tablic(?:a|y|ę)|"
    r"słup(?:a|y|em)?|slup(?:a|y|em)?)\b",
    re.IGNORECASE,
)


def normalized(value: str | None) -> str:
    return " ".join(re.findall(r"\w+", (value or "").casefold()))


def dhash(image: Image.Image) -> int:
    pixel = list(ImageOps.grayscale(image).resize((9, 8)).getdata())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | int(pixel[y * 9 + x] > pixel[y * 9 + x + 1])
    return bits


def paths_by_filename(root: Path) -> dict[str, Path]:
    lookup: dict[str, Path] = {}
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            lookup.setdefault(path.name, path)
    return lookup


def image_stats(path: Path):
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        gray = ImageOps.grayscale(image)
        mean, deviation = ImageStat.Stat(gray).mean[0], ImageStat.Stat(gray).stddev[0]
        edges = gray.resize((120, 120)).filter(ImageFilter.FIND_EDGES)
        edges_std = ImageStat.Stat(edges).stddev[0]
        entropy = gray.entropy()
        return {
            "width": image.width, "height": image.height,
            "luminance": round(mean, 1), "contrast": round(deviation, 1),
            "edge_std": round(edges_std, 1), "entropy": round(entropy, 2),
            "dhash": format(dhash(image), "016x"),
        }


def make_sheet(items: list[dict], path: Path, title: str, thumbnails: dict[str, Path],
               columns: int = 8, rows: int = 8) -> None:
    tile_w, tile_h, header_h = 238, 181, 58
    sheet = Image.new("RGB", (columns * tile_w, header_h + math.ceil(len(items) / columns) * tile_h), "#fafafa")
    draw = ImageDraw.Draw(sheet)
    draw.text((14, 15), title[:180], fill="#101010")
    for i, entry in enumerate(items):
        x = (i % columns) * tile_w
        y = header_h + (i // columns) * tile_h
        draw.rectangle([x + 2, y + 2, x + tile_w - 2, y + tile_h - 2], outline="#cccccc", width=1)
        photo_path = thumbnails.get(entry["photo_id"])
        if photo_path:
            try:
                with Image.open(photo_path) as source:
                    photo = ImageOps.contain(ImageOps.exif_transpose(source).convert("RGB"), (tile_w - 12, 123), Image.Resampling.LANCZOS)
                    sheet.paste(photo, (x + (tile_w - photo.width) // 2, y + 5))
            except (OSError, ValueError):
                draw.text((x + 12, y + 48), "IMAGE ERROR", fill="#a00000")
        draw.text((x + 7, y + 131), f'{entry["label"]}  {entry["place_slug"][:21]}', fill="#111111")
        cap = (entry.get("caption") or "").replace("\n", " ")
        draw.text((x + 7, y + 149), cap[:31], fill="#444444")
        if entry.get("is_cover"):
            draw.text((x + tile_w - 58, y + 165), "COVER", fill="#a00000")
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, "JPEG", quality=80, optimize=True, progressive=True)


def build(snapshot: dict, root: Path, dest: Path) -> dict:
    photos = [p for p in snapshot["photos"] if p["status"] == "approved"]
    photos.sort(key=lambda p: (p["place_slug"], p["id"]))
    lookup = paths_by_filename(root)
    thumbnails: dict[str, Path] = {}
    entries: list[dict] = []
    missing: list[str] = []
    by_place: dict[str, list[dict]] = defaultdict(list)
    for index, photo in enumerate(photos, 1):
        name = Path(photo.get("thumb_path") or "").name
        file_path = lookup.get(name)
        if not file_path:
            missing.append(photo["id"])
        else:
            thumbnails[photo["id"]] = file_path
        entry = {
            "label": f"F{index:04d}", "photo_id": photo["id"],
            "place_id": photo["place_id"], "place_slug": photo["place_slug"],
            "place_title": photo["place_title"], "is_cover": photo["is_cover"],
            "caption": photo.get("caption"), "description_blocks": photo.get("description_blocks") or [],
            "thumb_path": photo.get("thumb_path"), "flags": [], "metrics": {},
        }
        if file_path:
            try:
                entry["metrics"] = image_stats(file_path)
            except (OSError, ValueError):
                entry["flags"].append("corrupt_thumbnail")
        text = (photo.get("caption") or "") + " " + " ".join(b.get("text", "") for b in photo.get("description_blocks") or [])
        if SUSPICIOUS.search(text):
            entry["flags"].append("questionable_subject_keyword")
        metrics = entry["metrics"]
        if metrics:
            if metrics["entropy"] < 5.0 or metrics["contrast"] < 25:
                entry["flags"].append("low_texture_or_contrast")
            if metrics["edge_std"] < 17:
                entry["flags"].append("little_visual_detail")
            if metrics["luminance"] < 40 or metrics["luminance"] > 216:
                entry["flags"].append("extreme_exposure")
        entries.append(entry)
        by_place[entry["place_id"]].append(entry)

    pairs = []
    for group in by_place.values():
        for i, a in enumerate(group):
            if not a["metrics"]:
                continue
            for b in group[i + 1:]:
                if not b["metrics"]:
                    continue
                dist = (int(a["metrics"]["dhash"], 16) ^ int(b["metrics"]["dhash"], 16)).bit_count()
                if dist <= 5:
                    pairs.append({"first": a["label"], "second": b["label"], "first_id": a["photo_id"],
                                  "second_id": b["photo_id"], "place_slug": a["place_slug"], "hamming": dist})
                    a["flags"].append("visually_similar_pair")
                    b["flags"].append("visually_similar_pair")

    dup = defaultdict(list)
    for a in entries:
        cap = normalized(a["caption"])
        if cap and len(cap) > 5:
            dup[(a["place_id"], cap)].append(a)
    caption_pairs = []
    for (_, _), group in dup.items():
        if len(group) > 1:
            caption_pairs.append({"place_slug": group[0]["place_slug"], "labels": [x["label"] for x in group]})
    dest.mkdir(parents=True, exist_ok=True)
    station = [a for a in entries if "dworzec" in a["place_slug"] or "dworzec" in a["place_title"].casefold()]
    candidate = [a for a in entries if a["flags"]]
    candidate.sort(key=lambda p: (
        not p["flags"].__contains__("questionable_subject_keyword"),
        not p["flags"].__contains__("visually_similar_pair"),
        -len(p["flags"]),
        p["place_slug"], p["label"],
    ))
    selected = station + [x for x in candidate if x["photo_id"] not in {y["photo_id"] for y in station}]
    make_sheet(station, dest / "station.jpg", "DWORCE — weryfikacja kadrów i podpisów", thumbnails, columns=5)
    for offset in range(0, min(len(selected), 240), 64):
        make_sheet(selected[offset:offset+64], dest / f"suspect-{offset//64:02d}.jpg",
                   f"PODEJRZANE KADRY — {offset+1}–{min(offset+64,len(selected))}", thumbnails)
    for offset in range(0, len(entries), 64):
        make_sheet(entries[offset:offset+64], dest / f"all-{offset//64:02d}.jpg",
                   f"PRZEGLĄD CAŁEJ GALERII — {offset+1}–{min(offset+64,len(entries))}", thumbnails)
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "approved_count": len(entries), "missing_thumbnails": missing, "station_count": len(station),
        "possible_duplicate_pairs": sorted(pairs, key=lambda p: (p["hamming"], p["place_slug"])),
        "same_caption_groups": caption_pairs,
        "risk_flag_counts": dict(Counter(flag for a in entries for flag in a["flags"])),
        "notes": "All visual flags are candidates only. No automatic removal or approval.",
        "photos": entries,
    }
    (dest / "index.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"approved": len(entries), "missing": len(missing), "station": len(station),
            "flagged": len(candidate), "similar_pairs": len(pairs), "caption_groups": len(caption_pairs),
            "sheets": 1 + math.ceil(min(len(selected), 240) / 64) + math.ceil(len(entries) / 64)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--snapshot", required=True)
    ap.add_argument("--thumb-root", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    summary = build(json.loads(Path(args.snapshot).read_text(encoding="utf-8")),
                    Path(args.thumb_root), Path(args.out))
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
