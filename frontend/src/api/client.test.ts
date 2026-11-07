import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiErrorMessageFromBody,
  apiRequestIdFromBody,
  bumpMediaCacheRevision,
  clearAdminSessionToken,
  deleteAdminMemoryAudio,
  deleteAdminPhotoAudio,
  getAdminPhotoAlbums,
  getAdminPlacePhotos,
  getAdminMemories,
  getAdminModerationCounts,
  getAdminPhotos,
  getAdminReports,
  mediaUrl,
  redactAdminMemory,
  request,
  setAdminSessionToken,
  updateAdminMemoryAudio,
  updateAdminPhotoAudio,
  uploadAdminPlacePhoto,
  uploadPlaceMemory,
} from "./client";

afterEach(() => {
  clearAdminSessionToken();
  vi.unstubAllGlobals();
});

describe("mediaUrl", () => {
  it("keeps absolute URLs unchanged", () => {
    expect(mediaUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
  });

  it("prefixes API base URL for local media paths", () => {
    expect(mediaUrl("/media/photos/test.jpg")).toBe("http://127.0.0.1:8000/media/photos/test.jpg");
  });

  it("adds a revision query for local media after media edits", () => {
    const localStorage = {
      getItem: vi.fn(() => "revision-1"),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };
    vi.stubGlobal("window", { localStorage });

    expect(mediaUrl("/media/photos/test.jpg")).toBe("http://127.0.0.1:8000/media/photos/test.jpg?v=revision-1");
    expect(mediaUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
  });

  it("uses a distinct media revision for edits within the same millisecond", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    const localStorage = {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };
    vi.stubGlobal("window", { localStorage });

    try {
      const firstRevision = bumpMediaCacheRevision();
      const nextRevision = bumpMediaCacheRevision();

      expect(nextRevision).not.toBe(firstRevision);
      expect(localStorage.setItem).toHaveBeenNthCalledWith(1, "photomap_media_cache_revision", firstRevision);
      expect(localStorage.setItem).toHaveBeenNthCalledWith(2, "photomap_media_cache_revision", nextRevision);
    } finally {
      now.mockRestore();
    }
  });

  it("stores a new media revision after mutable media edits", () => {
    const localStorage = {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };
    vi.stubGlobal("window", { localStorage });

    const revision = bumpMediaCacheRevision();

    expect(revision).not.toBe("");
    expect(localStorage.setItem).toHaveBeenCalledWith("photomap_media_cache_revision", revision);
  });
});

describe("apiErrorMessageFromBody", () => {
  it("formats FastAPI validation errors without leaking raw JSON", () => {
    expect(
      apiErrorMessageFromBody(
        JSON.stringify({
          detail: [
            {
              loc: ["body", "memory_text"],
              msg: "Field required",
            },
          ],
        }),
        "Request failed",
      ),
    ).toBe("body.memory_text: Field required");
  });

  it("uses string details directly", () => {
    expect(apiErrorMessageFromBody(JSON.stringify({ detail: "Invalid memory token" }), "Request failed")).toBe(
      "Invalid memory token",
    );
  });
});

describe("apiRequestIdFromBody", () => {
  it("reads request IDs from backend error payloads", () => {
    expect(apiRequestIdFromBody(JSON.stringify({ detail: "Invalid", request_id: "req-123" }))).toBe("req-123");
  });
});

describe("request", () => {
  it("attaches backend request IDs to API errors", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ detail: "Invalid payload", request_id: "body-req" }), {
        headers: { "Content-Type": "application/json", "X-Request-ID": "header-req" },
        status: 422,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/api/places")).rejects.toMatchObject({
      message: "Invalid payload",
      requestId: "header-req",
      status: 422,
    });
  });
});

describe("admin queue requests", () => {
  it("requests bounded moderation queues", async () => {
    setAdminSessionToken("admin-token");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" }, status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getAdminPhotos({ limit: 25, status: "pending" });
    await getAdminMemories({ limit: 25, status: "approved" });
    await getAdminReports({ limit: 20, status: "open" });
    await getAdminModerationCounts();
    await getAdminPhotoAlbums({ audio: "with-audio", placeId: "place-1", query: "Most", status: "approved" });
    await getAdminPlacePhotos("place-1", { audio: "without-audio", query: "Most", status: "approved" });

    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/admin/photos?limit=25&status=pending");
    expect(fetchMock.mock.calls[1][0]).toBe("http://127.0.0.1:8000/api/admin/memories?limit=25&status=approved");
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1:8000/api/admin/reports?limit=20&status=open");
    expect(fetchMock.mock.calls[3][0]).toBe("http://127.0.0.1:8000/api/admin/moderation/counts");
    expect(fetchMock.mock.calls[4][0]).toBe(
      "http://127.0.0.1:8000/api/admin/photos/albums?status=approved&place_id=place-1&query=Most&audio=with-audio",
    );
    expect(fetchMock.mock.calls[5][0]).toBe(
      "http://127.0.0.1:8000/api/admin/places/place-1/photos?status=approved&query=Most&audio=without-audio",
    );
  });
});

describe("admin media redaction requests", () => {
  it("posts polygon redactions to the memory endpoint", async () => {
    setAdminSessionToken("admin-token");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          actions: [
            {
              action: "redact_image",
              applied: true,
              label: "public",
              path: "/tmp/public.jpg",
              shapes: 1,
            },
          ],
          generated_at: "2026-06-18T00:00:00Z",
          id: "media-1",
          issues: [],
          kind: "photo",
          mode: "apply",
          status: "ok",
          summary: {
            actions: { applied: 3, total: 3 },
            issues: { by_severity: { error: 0, info: 0, warning: 0 }, total: 0 },
          },
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      polygons: [
        [
          { x: 0.1, y: 0.1 },
          { x: 0.8, y: 0.1 },
          { x: 0.8, y: 0.5 },
          { x: 0.1, y: 0.5 },
        ],
      ],
      rectangles: [],
    };

    const report = await redactAdminMemory("memory-1", payload);

    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/admin/memories/memory-1/redaction");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(payload);
    expect(report.actions).toEqual([
      {
        action: "redact_image",
        applied: true,
        label: "public",
        path: "/tmp/public.jpg",
        shapes: 1,
      },
    ]);
    expect(report.issues).toEqual([]);
  });
});

describe("uploadPlaceMemory", () => {
  it("sends only the add-memory form contract", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          author_city: "Wrocław",
          author_name: "Marta",
          caption: "Kwiatuszek",
          created_at: "2026-06-10T00:00:00",
          id: "memory-1",
          memory_text: "Było spokojnie",
          place_id: "place-1",
          status: "pending",
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await uploadPlaceMemory("place-1", {
      authorCity: " Wrocław ",
      authorName: " Marta ",
      caption: " Kwiatuszek ",
      claimToken: " token-123 ",
      consentConfirmed: true,
      file: new File(["image"], "memory.jpg", { type: "image/jpeg" }),
      memoryText: " Było spokojnie ",
    });

    const calls = fetchMock.mock.calls as Array<Parameters<typeof fetch>>;
    const [, options] = calls[0];
    const body = options?.body as FormData;

    expect(options?.method).toBe("POST");
    expect(body.get("caption")).toBe("Kwiatuszek");
    expect(body.get("memory_text")).toBe("Było spokojnie");
    expect(body.get("claim_token")).toBe("token-123");
    expect(body.get("consent_confirmed")).toBe("true");
    expect(body.get("author_name")).toBe("Marta");
    expect(body.get("author_city")).toBe("Wrocław");
    expect(body.get("audio_file")).toBeNull();
  });

  it("adds memory audio when selected", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          author_city: null,
          author_name: null,
          caption: "Kwiatuszek",
          created_at: "2026-06-10T00:00:00",
          id: "memory-1",
          memory_text: "Było spokojnie",
          place_id: "place-1",
          status: "pending",
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const audioFile = new File(["audio"], "memory.mp3", { type: "audio/mpeg" });

    await uploadPlaceMemory("place-1", {
      audioFile,
      authorCity: "",
      authorName: "",
      caption: "Kwiatuszek",
      claimToken: "token-123",
      consentConfirmed: true,
      file: new File(["image"], "memory.jpg", { type: "image/jpeg" }),
      memoryText: "Było spokojnie",
    });

    const body = fetchMock.mock.calls[0][1]?.body as FormData;

    expect(body.get("audio_file")).toBe(audioFile);
  });
});

describe("uploadAdminPlacePhoto", () => {
  it("uses the admin place photo contract without public consent fields", async () => {
    setAdminSessionToken("admin-token");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          admin_audio: null,
          admin_public_path: "/api/admin/photos/photo-1/media/image",
          admin_thumb_path: "/api/admin/photos/photo-1/media/thumb",
          approved_at: null,
          audio: null,
          attribution_author: null,
          attribution_license: null,
          attribution_license_url: null,
          attribution_source_url: null,
          caption: "Główne",
          description_blocks: [{ type: "paragraph", text: "Opis zdjęcia" }],
          consent_confirmed: true,
          created_at: "2026-06-10T00:00:00",
          id: "photo-1",
          place_id: "place-1",
          public_path: null,
          role: "gallery",
          source: "editorial",
          status: "pending",
          thumb_path: null,
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await uploadAdminPlacePhoto("place-1", new File(["image"], "place.jpg", { type: "image/jpeg" }), {
      attribution_author: " Autor ",
      attribution_license: " CC0 ",
      attribution_license_url: " https://creativecommons.org/publicdomain/zero/1.0/ ",
      attribution_source_url: " https://commons.wikimedia.org/wiki/File:Photo.jpg ",
      caption: " Główne ",
      description_blocks: [{ type: "paragraph", text: "Opis zdjęcia" }],
    });

    const calls = fetchMock.mock.calls as Array<Parameters<typeof fetch>>;
    const [url, options] = calls[0];
    const body = options?.body as FormData;
    const headers = options?.headers as Headers;

    expect(url).toBe("http://127.0.0.1:8000/api/admin/places/place-1/photos");
    expect(options?.method).toBe("POST");
    expect(headers.get("Authorization")).toBe("Bearer admin-token");
    expect(body.get("caption")).toBe("Główne");
    expect(body.get("description_blocks")).toBe('[{"type":"paragraph","text":"Opis zdjęcia"}]');
    expect(body.get("attribution_author")).toBe("Autor");
    expect(body.get("attribution_license")).toBe("CC0");
    expect(body.get("attribution_license_url")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(body.get("attribution_source_url")).toBe("https://commons.wikimedia.org/wiki/File:Photo.jpg");
    expect(body.get("consent_confirmed")).toBeNull();
    expect(body.get("audio_file")).toBeNull();
  });

  it("adds admin photo audio when selected", async () => {
    setAdminSessionToken("admin-token");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          admin_audio: {
            duration_seconds: 1.2,
            mime_type: "audio/mpeg",
            public_path: "/api/admin/photos/photo-1/media/audio",
            size_bytes: 1200,
          },
          admin_public_path: "/api/admin/photos/photo-1/media/image",
          admin_thumb_path: "/api/admin/photos/photo-1/media/thumb",
          approved_at: null,
          audio: null,
          attribution_author: null,
          attribution_license: null,
          attribution_license_url: null,
          attribution_source_url: null,
          caption: "Główne",
          description_blocks: [],
          consent_confirmed: true,
          created_at: "2026-06-10T00:00:00",
          id: "photo-1",
          place_id: "place-1",
          public_path: null,
          role: "gallery",
          source: "editorial",
          status: "pending",
          thumb_path: null,
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const audioFile = new File(["audio"], "place.mp3", { type: "audio/mpeg" });

    await uploadAdminPlacePhoto(
      "place-1",
      new File(["image"], "place.jpg", { type: "image/jpeg" }),
      { caption: " Główne " },
      audioFile,
    );

    const body = fetchMock.mock.calls[0][1]?.body as FormData;

    expect(body.get("audio_file")).toBe(audioFile);
  });
});

describe("admin audio attachment requests", () => {
  it("sets and deletes existing media audio through admin endpoints", async () => {
    setAdminSessionToken("admin-token");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          approved_at: null,
          audio: null,
          attribution_author: null,
          attribution_license: null,
          attribution_license_url: null,
          attribution_source_url: null,
          caption: "Audio",
          description_blocks: [],
          consent_confirmed: true,
          created_at: "2026-06-10T00:00:00",
          id: "media-1",
          memory_text: "Text",
          paid: false,
          place_id: "place-1",
          public_path: "/media/photos/photo-1.jpg",
          role: "gallery",
          share_slug: "memory-share",
          source: "editorial",
          status: "approved",
          thumb_path: "/media/photos/photo-1-thumb.jpg",
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const audioFile = new File(["audio"], "clip.mp3", { type: "audio/mpeg" });

    await updateAdminPhotoAudio("photo-1", audioFile);
    await deleteAdminPhotoAudio("photo-1");
    await updateAdminMemoryAudio("memory-1", audioFile);
    await deleteAdminMemoryAudio("memory-1");

    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/admin/photos/photo-1/audio");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PUT");
    expect((fetchMock.mock.calls[0][1]?.body as FormData).get("audio_file")).toBe(audioFile);
    expect(fetchMock.mock.calls[1][0]).toBe("http://127.0.0.1:8000/api/admin/photos/photo-1/audio");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1:8000/api/admin/memories/memory-1/audio");
    expect(fetchMock.mock.calls[2][1]?.method).toBe("PUT");
    expect((fetchMock.mock.calls[2][1]?.body as FormData).get("audio_file")).toBe(audioFile);
    expect(fetchMock.mock.calls[3][0]).toBe("http://127.0.0.1:8000/api/admin/memories/memory-1/audio");
    expect(fetchMock.mock.calls[3][1]?.method).toBe("DELETE");
  });
});
