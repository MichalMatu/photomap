from io import BytesIO

from PIL import Image

from app.api.routes import admin_photos
from app.services.media.admin_previews import cache_directory
from app.tests.support import ADMIN_HEADERS, create_place, image_upload


def test_approved_thumbnail_reuses_published_file(client_session, monkeypatch, tmp_path) -> None:
    client, session = client_session
    place = create_place(session)
    uploaded = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("cover.jpg")},
    )
    assert uploaded.status_code == 201
    photo_id = uploaded.json()["id"]
    approved = client.post(
        f"/api/admin/photos/{photo_id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    assert approved.status_code == 200
    thumb_path = tmp_path / "public" / approved.json()["thumb_path"].removeprefix("/media/")
    original_thumb = thumb_path.read_bytes()

    def fail_decode(*_args, **_kwargs):
        raise AssertionError("A published thumbnail must not decode the original")

    monkeypatch.setattr(admin_photos.Image, "open", fail_decode)
    response = client.get(f"/api/admin/photos/{photo_id}/media/thumb", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.content == original_thumb
    assert response.headers["content-type"].startswith("image/")


def test_pending_thumbnail_reduces_image_before_converting(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    raw = BytesIO()
    Image.new("RGB", (3200, 2400), "navy").save(raw, format="JPEG")
    raw.seek(0)
    uploaded = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": ("large.jpg", raw, "image/jpeg")},
    )
    assert uploaded.status_code == 201
    photo_id = uploaded.json()["id"]

    actual_sizes = []
    normalize = admin_photos.images.normalized_public_image

    def track_preview_size(image, output_format):
        actual_sizes.append(image.size)
        return normalize(image, output_format)

    monkeypatch.setattr(admin_photos.images, "normalized_public_image", track_preview_size)
    response = client.get(f"/api/admin/photos/{photo_id}/media/thumb", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert actual_sizes
    assert max(actual_sizes[0]) <= max(admin_photos.images.THUMB_SIZE) * 2
    with Image.open(BytesIO(response.content)) as thumbnail:
        assert thumbnail.size == admin_photos.images.THUMB_SIZE


def test_pending_thumbnail_returns_retry_when_decode_slot_is_busy(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    uploaded = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("pending.jpg")},
    )
    assert uploaded.status_code == 201

    class BusySlot:
        def acquire(self, timeout):
            return False

    monkeypatch.setattr(admin_photos, "_uncached_thumb_slots", BusySlot())
    response = client.get(
        f"/api/admin/photos/{uploaded.json()['id']}/media/thumb",
        headers=ADMIN_HEADERS,
    )
    assert response.status_code == 503
    assert response.headers["retry-after"] == "2"


def test_private_preview_is_cached_and_removed_with_deleted_photo(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    uploaded = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("private.jpg")},
    )
    assert uploaded.status_code == 201
    photo_id = uploaded.json()["id"]
    endpoint = f"/api/admin/photos/{photo_id}/media/thumb"

    first = client.get(endpoint, headers=ADMIN_HEADERS)
    assert first.status_code == 200
    directory = cache_directory(photo_id)
    assert len(list(directory.glob("*.jpg"))) == 1

    def never_decode(*_args, **_kwargs):
        raise AssertionError("Cache hit decoded a private original again")

    monkeypatch.setattr(admin_photos.Image, "open", never_decode)
    second = client.get(endpoint, headers=ADMIN_HEADERS)
    assert second.status_code == 200
    assert second.content == first.content

    deleted = client.delete(f"/api/admin/photos/{photo_id}", headers=ADMIN_HEADERS)
    assert deleted.status_code == 204
    assert not directory.exists()


def test_large_nonjpeg_preview_refuses_decompression_before_decode(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    raw = BytesIO()
    Image.new("RGB", (3200, 2600), "blue").save(raw, "PNG")
    raw.seek(0)
    uploaded = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": ("large.png", raw, "image/png")},
    )
    assert uploaded.status_code == 201
    photo_id = uploaded.json()["id"]

    response = client.get(f"/api/admin/photos/{photo_id}/media/thumb", headers=ADMIN_HEADERS)
    assert response.status_code == 413
    # The original is still retained even though the preview is too large.
    assert client.get(f"/api/admin/photos/{photo_id}/media/image", headers=ADMIN_HEADERS).status_code == 200
