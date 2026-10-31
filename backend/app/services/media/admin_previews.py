"""Private on-disk thumbnail cache for authenticated admin media.

Cache keys include the original file's identity and metadata, so replacing the
original invalidates the cached preview. Files remain under private storage.
"""

from __future__ import annotations

import hashlib
import os
import shutil
from pathlib import Path
from uuid import uuid4

from app.services.media import images


def cache_directory(photo_id: str) -> Path:
    directory_key = hashlib.sha256(photo_id.encode("utf-8")).hexdigest()
    return images.storage_path(images.PRIVATE_STORAGE_DIR, f".admin-thumbnails/{directory_key}")


def preview_cache_path(photo_id: str, original_path: Path) -> Path | None:
    try:
        metadata = original_path.stat()
    except FileNotFoundError:
        return None

    identity = f"{original_path.resolve()}:{metadata.st_size}:{metadata.st_mtime_ns}"
    fingerprint = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24]
    directory = cache_directory(photo_id)
    for extension in (".jpg", ".png"):
        candidate = directory / f"{fingerprint}{extension}"
        if candidate.is_file():
            return candidate
    return None


def write_preview_cache(photo_id: str, original_path: Path, content: bytes, image_format: str) -> Path:
    metadata = original_path.stat()
    identity = f"{original_path.resolve()}:{metadata.st_size}:{metadata.st_mtime_ns}"
    fingerprint = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24]
    extension = ".png" if image_format == "PNG" else ".jpg"
    directory = cache_directory(photo_id)
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / f"{fingerprint}{extension}"

    temporary = directory / f".{uuid4().hex}.tmp"
    try:
        with temporary.open("xb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)

    # A replacement original should not retain older versions indefinitely.
    for old in directory.iterdir():
        if old != target and old.is_file() and not old.name.endswith(".tmp"):
            old.unlink(missing_ok=True)
    return target


def delete_preview_cache(photo_id: str) -> None:
    directory = cache_directory(photo_id)
    if directory.exists():
        shutil.rmtree(directory)
