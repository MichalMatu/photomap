from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.models.photo import Photo
from app.schemas.content import ContentBlock
from app.services.media.audio import (
    StoredPrivateAudio,
    audio_paths,
    clear_audio_metadata,
    delete_public_audio,
    delete_stored_audio,
    publish_private_audio,
    store_private_audio_bytes,
)
from app.services.media.admin_previews import delete_preview_cache
from app.services.media.images import (
    StoredPrivateImage,
    delete_public_image,
    delete_stored_image,
    publish_image_thumbnail,
    store_private_image_bytes,
)
from app.services.photo_fields import (
    normalize_photo_attribution,
    normalize_photo_caption,
    normalize_photo_description_blocks,
)
from app.services.photo_media import public_photo_image_url_for


def delete_photo_files(photo: Photo) -> None:
    delete_stored_image(photo.original_path, photo.public_path, photo.thumb_path)
    delete_stored_audio(photo.audio_original_path, photo.audio_public_path)
    delete_preview_cache(photo.id)


def cleanup_stored_upload(
    stored_image: StoredPrivateImage | None,
    stored_audio: StoredPrivateAudio | None,
) -> None:
    if stored_image is not None:
        delete_stored_image(stored_image.original_path, None, None)
    if stored_audio is not None:
        delete_stored_audio(stored_audio.original_path, None)


def publish_photo_media(photo: Photo) -> None:
    if photo.original_path is None:
        raise HTTPException(status_code=422, detail="Photo original is no longer retained")
    photo.thumb_path = publish_image_thumbnail(photo.original_path)
    photo.public_path = public_photo_image_url_for(photo)

    try:
        if photo.audio_original_path is not None:
            stored_audio = publish_private_audio(photo.audio_original_path)
            photo.audio_public_path = stored_audio.public_path
            photo.audio_size_bytes = stored_audio.size_bytes
    except HTTPException:
        delete_public_image(photo.public_path, photo.thumb_path)
        photo.public_path = None
        photo.thumb_path = None
        photo.audio_public_path = None
        raise


def unpublish_photo_media(photo: Photo) -> None:
    delete_public_image(photo.public_path, photo.thumb_path)
    delete_public_audio(photo.audio_public_path)
    photo.public_path = None
    photo.thumb_path = None
    photo.audio_public_path = None


async def create_editorial_photo_from_upload(
    *,
    audio_file: UploadFile | None = None,
    attribution_author: str | None = None,
    attribution_license: str | None = None,
    attribution_license_url: str | None = None,
    attribution_source_url: str | None = None,
    caption: str | None,
    description_blocks: list[ContentBlock] | None = None,
    file: UploadFile,
    place_id: str,
    session: Session,
) -> Photo:
    normalized_caption = normalize_photo_caption(caption)
    normalized_description_blocks = normalize_photo_description_blocks(description_blocks)
    attribution = normalize_photo_attribution(
        attribution_author=attribution_author,
        attribution_license=attribution_license,
        attribution_license_url=attribution_license_url,
        attribution_source_url=attribution_source_url,
    )
    content = await file.read()
    audio_content = await audio_file.read() if audio_file is not None else None

    stored_image = None
    stored_audio: StoredPrivateAudio | None = None
    try:
        stored_image = store_private_image_bytes(content, file.filename, place_id, "photos")
        if audio_file is not None and audio_content is not None:
            stored_audio = store_private_audio_bytes(
                audio_content,
                audio_file.filename,
                audio_file.content_type,
                place_id,
                "photos",
            )
        photo = Photo(
            place_id=place_id,
            original_path=stored_image.original_path,
            public_path=None,
            thumb_path=None,
            audio_original_path=stored_audio.original_path if stored_audio else None,
            audio_public_path=None,
            audio_mime_type=stored_audio.mime_type if stored_audio else None,
            audio_size_bytes=stored_audio.size_bytes if stored_audio else None,
            audio_duration_seconds=stored_audio.duration_seconds if stored_audio else None,
            status="pending",
            source="editorial",
            caption=normalized_caption,
            description_blocks=normalized_description_blocks,
            **attribution,
            consent_confirmed=True,
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)
    except HTTPException:
        cleanup_stored_upload(stored_image, stored_audio)
        raise
    except SQLAlchemyError as exc:
        session.rollback()
        cleanup_stored_upload(stored_image, stored_audio)
        raise HTTPException(status_code=500, detail="Photo could not be saved") from exc
    return photo


async def replace_photo_audio(photo: Photo, audio_file: UploadFile, session: Session) -> Photo:
    content = await audio_file.read()
    old_original_path, old_public_path = audio_paths(photo)
    stored_audio: StoredPrivateAudio | None = None
    stored_public_path: str | None = None
    try:
        stored_audio = store_private_audio_bytes(
            content,
            audio_file.filename,
            audio_file.content_type,
            photo.place_id,
            "photos",
        )
        photo.audio_original_path = stored_audio.original_path
        photo.audio_public_path = None
        photo.audio_mime_type = stored_audio.mime_type
        photo.audio_size_bytes = stored_audio.size_bytes
        photo.audio_duration_seconds = stored_audio.duration_seconds
        if photo.status == "approved":
            published_audio = publish_private_audio(stored_audio.original_path)
            stored_public_path = published_audio.public_path
            photo.audio_public_path = published_audio.public_path
            photo.audio_size_bytes = published_audio.size_bytes
        session.add(photo)
        session.commit()
        session.refresh(photo)
    except HTTPException:
        if stored_audio is not None:
            delete_stored_audio(stored_audio.original_path, stored_public_path)
        raise
    except SQLAlchemyError as exc:
        session.rollback()
        if stored_audio is not None:
            delete_stored_audio(stored_audio.original_path, stored_public_path)
        raise HTTPException(status_code=500, detail="Photo audio could not be saved") from exc

    delete_stored_audio(old_original_path, old_public_path)
    return photo


def delete_photo_audio(photo: Photo, session: Session) -> Photo:
    old_original_path, old_public_path = audio_paths(photo)
    clear_audio_metadata(photo)
    try:
        session.add(photo)
        session.commit()
        session.refresh(photo)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="Photo audio could not be deleted") from exc

    delete_stored_audio(old_original_path, old_public_path)
    return photo
