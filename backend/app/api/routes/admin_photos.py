from io import BytesIO
from mimetypes import guess_type
from threading import BoundedSemaphore

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.api.pagination import ADMIN_QUEUE_DEFAULT_LIMIT, ADMIN_QUEUE_MAX_LIMIT
from app.api.redaction import redact_admin_media
from app.db.session import get_session
from app.schemas.contract_types import ReviewStatus
from app.schemas.media_redaction import MediaRedactionPayload, MediaRedactionReport
from app.schemas.photo import PhotoAdminAlbumRead, PhotoAdminRead, PhotoReview, PhotoUpdate
from app.schemas.place import PlaceAdminRead
from app.serializers.photo import photo_to_admin_read
from app.serializers.place import place_to_admin_read
from app.services.admin_photos import (
    AdminPhotoAudioFilter,
    delete_admin_photo,
    delete_admin_photo_audio,
    get_admin_photo,
    list_admin_photo_album_rows,
    list_admin_photo_queue,
    replace_admin_photo_audio,
    review_admin_photo,
    set_admin_cover_photo,
    update_admin_photo,
)
from app.services.media import images
from app.services.place_taxonomy import category_ids_by_place_id

router = APIRouter(prefix="/api/admin/photos", tags=["admin photos"], dependencies=[Depends(require_admin_token)])

# Full-resolution private originals are expensive to decode on a Pi Zero 2 W.
# Serialize only the thumbnails that cannot reuse a published derivative.
_uncached_thumb_slots = BoundedSemaphore(1)


def private_photo_image_path(photo_id: str, session: Session):
    photo = get_admin_photo(session, photo_id)
    if photo.original_path is None:
        raise HTTPException(status_code=404, detail="Photo media not found")
    path = images.storage_path(images.PRIVATE_STORAGE_DIR, photo.original_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Photo media not found")
    return path


def photo_thumbnail_response(photo_id: str, session: Session) -> FileResponse | Response:
    photo = get_admin_photo(session, photo_id)
    # Approved photos already have a small public derivative. Re-encoding the
    # private original for every admin thumbnail can exhaust Raspberry Pi RAM.
    if photo.status == "approved":
        published_thumb = images.static_public_storage_path(photo.thumb_path)
        if published_thumb is not None and published_thumb.is_file():
            return FileResponse(
                published_thumb,
                media_type=guess_type(published_thumb.name)[0] or "application/octet-stream",
            )

    path = private_photo_image_path(photo_id, session)
    if not _uncached_thumb_slots.acquire(timeout=3):
        raise HTTPException(
            status_code=503,
            detail="Photo thumbnail renderer is busy",
            headers={"Retry-After": "2"},
        )

    try:
        try:
            with Image.open(path) as image:
                # JPEG decoder subsampling and early thumbnailing avoid expanding
                # a full-size RGB/RGBA copy before the 520px preview is created.
                preview_size = (images.THUMB_SIZE[0] * 2, images.THUMB_SIZE[1] * 2)
                image.draft("RGB", preview_size)
                image.thumbnail(preview_size, resample=Image.Resampling.LANCZOS)
                output_format = images.public_image_format(image)
                output_image = images.normalized_public_image(image, output_format)
                thumbnail = ImageOps.fit(
                    output_image,
                    images.THUMB_SIZE,
                    method=Image.Resampling.LANCZOS,
                    centering=(0.5, 0.5),
                )
                buffer = BytesIO()
                if output_format == "PNG":
                    thumbnail.save(buffer, "PNG", optimize=True)
                    media_type = "image/png"
                else:
                    thumbnail.save(
                        buffer,
                        "JPEG",
                        quality=images.THUMB_IMAGE_QUALITY,
                        subsampling=images.THUMB_JPEG_SUBSAMPLING,
                        optimize=True,
                    )
                    media_type = "image/jpeg"
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise HTTPException(status_code=422, detail="Photo media could not be processed") from exc
        return Response(content=buffer.getvalue(), media_type=media_type)
    finally:
        _uncached_thumb_slots.release()


@router.get("", response_model=list[PhotoAdminRead])
def list_admin_photos(
    status: ReviewStatus | None = Query(default=None),
    limit: int = Query(default=ADMIN_QUEUE_DEFAULT_LIMIT, ge=1, le=ADMIN_QUEUE_MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> list[PhotoAdminRead]:
    photos = list_admin_photo_queue(session, limit=limit, offset=offset, status=status)
    return [photo_to_admin_read(photo) for photo in photos]


@router.get("/albums", response_model=list[PhotoAdminAlbumRead])
def list_admin_photo_albums(
    status: ReviewStatus | None = Query(default=None),
    place_id: str | None = Query(default=None),
    query: str | None = Query(default=None),
    audio: AdminPhotoAudioFilter = Query(default="all"),
    session: Session = Depends(get_session),
) -> list[PhotoAdminAlbumRead]:
    album_rows = list_admin_photo_album_rows(session, status=status, place_id=place_id, query=query, audio=audio)
    return [
        PhotoAdminAlbumRead(place_id=place_id, photo_count=photo_count, cover_photo=photo_to_admin_read(cover_photo))
        for place_id, photo_count, cover_photo in album_rows
    ]


@router.get("/{photo_id}/media/image")
def get_photo_admin_image(photo_id: str, session: Session = Depends(get_session)) -> FileResponse:
    path = private_photo_image_path(photo_id, session)
    media_type = guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type)


@router.get("/{photo_id}/media/thumb")
def get_photo_admin_thumbnail(photo_id: str, session: Session = Depends(get_session)) -> Response:
    return photo_thumbnail_response(photo_id, session)


@router.get("/{photo_id}/media/audio")
def get_photo_admin_audio(photo_id: str, session: Session = Depends(get_session)) -> FileResponse:
    photo = get_admin_photo(session, photo_id)
    if photo.audio_original_path is None:
        raise HTTPException(status_code=404, detail="Photo audio not found")
    path = images.storage_path(images.PRIVATE_STORAGE_DIR, photo.audio_original_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Photo audio not found")
    return FileResponse(path, media_type=photo.audio_mime_type or "application/octet-stream")


@router.post("/{photo_id}/review", response_model=PhotoAdminRead)
def review_photo(
    photo_id: str,
    payload: PhotoReview,
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    return photo_to_admin_read(review_admin_photo(session, photo_id, payload.status))


@router.patch("/{photo_id}", response_model=PhotoAdminRead)
def update_photo(
    photo_id: str,
    payload: PhotoUpdate,
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    return photo_to_admin_read(update_admin_photo(session, photo_id, payload))


@router.put("/{photo_id}/audio", response_model=PhotoAdminRead)
async def replace_photo_audio_attachment(
    photo_id: str,
    audio_file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    return photo_to_admin_read(await replace_admin_photo_audio(session, photo_id, audio_file))


@router.delete("/{photo_id}/audio", response_model=PhotoAdminRead)
def delete_photo_audio_attachment(photo_id: str, session: Session = Depends(get_session)) -> PhotoAdminRead:
    return photo_to_admin_read(delete_admin_photo_audio(session, photo_id))


@router.post("/{photo_id}/redaction", response_model=MediaRedactionReport)
def redact_photo(
    photo_id: str,
    payload: MediaRedactionPayload,
    session: Session = Depends(get_session),
) -> MediaRedactionReport:
    report = redact_admin_media("photo", photo_id, payload, session)
    return report


@router.post("/{photo_id}/cover", response_model=PlaceAdminRead)
def set_cover_photo(photo_id: str, session: Session = Depends(get_session)) -> PlaceAdminRead:
    place = set_admin_cover_photo(session, photo_id)
    return place_to_admin_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))


@router.delete("/{photo_id}", status_code=204)
def delete_photo_route(photo_id: str, session: Session = Depends(get_session)) -> None:
    delete_admin_photo(session, photo_id)
