import { describe, expect, it } from "vitest";

import type { Category, PlaceMapItem, PlaceMapPhoto, PlaceMapPreviewItem } from "../../../api/types";
import {
  bringPinnedMediaCardToFront,
  resolvePinnedMediaCards,
  updatePinnedMediaCaption,
  updatePinnedMediaDock,
  upsertPinnedMediaCard,
} from "./pinnedMediaBoardCards";
import {
  clampPinnedMediaLayout,
  pinnedMediaChromeHeight,
  defaultPinnedMediaLayout,
  snapPinnedMediaLayout,
  snapPinnedMediaResizeLayout,
} from "./pinnedMediaBoardLayout";
import { pinnedMediaConnectionGeometry } from "./pinnedMediaBoardLinkGeometry";
import { PINNED_MEDIA_STORAGE_KEY, readPinnedMediaCards, writePinnedMediaCards } from "./pinnedMediaBoardStorage";
import { MAX_PINNED_MEDIA_CARDS, type StoredPinnedMediaCard } from "./pinnedMediaBoardTypes";

class MemoryStorage implements Pick<Storage, "getItem" | "removeItem" | "setItem"> {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function storedCard(index: number, overrides: Partial<StoredPinnedMediaCard> = {}): StoredPinnedMediaCard {
  return {
    createdAt: 1_000 + index,
    id: `place-1:photo:photo-${index}`,
    itemId: `photo-${index}`,
    kind: "photo",
    layout: {
      aspectRatio: 1.6,
      height: 150,
      width: 240,
      x: 24 + index,
      y: 36 + index,
      zIndex: index,
    },
    placeId: "place-1",
    ...overrides,
  };
}

function category(): Category {
  return {
    description: null,
    icon: null,
    id: "category-1",
    label: "Punkt widokowy",
    sort_order: 1,
    status: "active",
  };
}

function photo(id: string): PlaceMapPhoto {
  return {
    approved_at: null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: `Zdjęcie ${id}`,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role: "gallery",
    source: "editorial",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function memory(id: string): PlaceMapPreviewItem {
  return {
    approved_at: null,
    audio: null,
    caption: `Pamiątka ${id}`,
    created_at: "2026-06-10T00:00:00",
    id,
    kind: "memory",
    place_id: "place-1",
    public_path: `/media/memories/${id}.jpg`,
    thumb_path: `/media/memories/${id}-thumb.jpg`,
  };
}

function place(): PlaceMapItem {
  const cover = photo("photo-1");

  return {
    categories: [category()],
    category_ids: ["category-1"],
    city: {
      default_zoom: 13,
      id: "city-1",
      lat: 51.1,
      lon: 17.03,
      name: "Wrocław",
      region: "Dolnośląskie",
      sort_order: 1,
      status: "active",
    },
    city_id: "city-1",
    cover_photo: cover,
    description: "Opis miejsca",
    id: "place-1",
    lat: 51.1,
    lon: 17.03,
    memory_count: 1,
    photo_count: 2,
    preview_items: [{ ...photo("photo-2"), kind: "photo" as const }, memory("memory-1")],
    score: 12,
    slug: "miejsce",
    custom_fields: {},
    title: "Miejsce",
    weight: 1,
  };
}

describe("pinned media board helpers", () => {
  it("stores and reads versioned localStorage state", () => {
    const storage = new MemoryStorage();
    const cards = [storedCard(1)];

    writePinnedMediaCards(cards, storage);

    expect(JSON.parse(storage.getItem(PINNED_MEDIA_STORAGE_KEY) ?? "{}")).toMatchObject({ version: 1 });
    expect(readPinnedMediaCards(storage)).toEqual(cards);
  });

  it("persists docked state and manual description mode without dropping existing pins", () => {
    const storage = new MemoryStorage();
    const first = updatePinnedMediaDock([storedCard(1)], "place-1:photo:photo-1", true);
    const cards = updatePinnedMediaCaption(first, "place-1:photo:photo-1");
    writePinnedMediaCards(cards, storage);
    expect(readPinnedMediaCards(storage)).toEqual(cards);
    expect(cards[0].docked).toBe(true);
    expect(cards[0].layout.captionHidden).toBe(true);
  });

  it("limits pinned cards to eight without removing older cards", () => {
    const cards = Array.from({ length: MAX_PINNED_MEDIA_CARDS }, (_, index) => storedCard(index + 1));
    const result = upsertPinnedMediaCard(
      cards,
      {
        itemId: "photo-9",
        kind: "photo",
        placeId: "place-1",
      },
      { height: 800, left: 0, top: 0, width: 1200 },
    );

    expect(result.status).toBe("limit");
    expect(result.cards).toEqual(cards);
  });

  it("does not create duplicate cards and brings an existing card to front", () => {
    const cards = [storedCard(1), storedCard(2)];
    const result = upsertPinnedMediaCard(
      cards,
      {
        itemId: "photo-1",
        kind: "photo",
        placeId: "place-1",
      },
      { height: 800, left: 0, top: 0, width: 1200 },
    );

    expect(result.status).toBe("updated");
    expect(result.cards).toHaveLength(2);
    expect(result.cards.find((card) => card.itemId === "photo-1")?.layout.zIndex).toBeGreaterThan(
      cards[1].layout.zIndex,
    );
  });

  it("resolves only cards still present in current map preview data", () => {
    const cards = [
      storedCard(1),
      storedCard(2),
      storedCard(3, {
        id: "place-1:memory:memory-1",
        itemId: "memory-1",
        kind: "memory",
      }),
      storedCard(4, {
        id: "missing-place:photo:photo-1",
        placeId: "missing-place",
      }),
    ];

    expect(resolvePinnedMediaCards(cards, [place()]).map((card) => card.id)).toEqual([
      "place-1:photo:photo-1",
      "place-1:photo:photo-2",
      "place-1:memory:memory-1",
    ]);
  });

  it("keeps cards inside the map frame bounds", () => {
    const layout = clampPinnedMediaLayout(
      {
        aspectRatio: 1.6,
        height: 600,
        width: 900,
        x: -100,
        y: 900,
        zIndex: 1,
      },
      { height: 640, left: 0, top: 0, width: 360 },
    );

    expect(layout.width).toBeLessThanOrEqual(336);
    expect(layout.x).toBeGreaterThanOrEqual(12);
    expect(layout.y + layout.height + pinnedMediaChromeHeight(layout)).toBeLessThanOrEqual(628);
  });

  it("keeps cards inside offset map frame bounds", () => {
    const layout = clampPinnedMediaLayout(
      {
        aspectRatio: 1.6,
        height: 150,
        width: 240,
        x: 24,
        y: 36,
        zIndex: 1,
      },
      { height: 640, left: 88, top: 0, width: 912 },
    );

    expect(layout.x).toBeGreaterThanOrEqual(100);
    expect(layout.x + layout.width).toBeLessThanOrEqual(988);
  });

  it("allows cards to grow beyond the old compact width cap", () => {
    const layout = clampPinnedMediaLayout(
      {
        aspectRatio: 1.6,
        height: 575,
        width: 920,
        x: 120,
        y: 80,
        zIndex: 1,
      },
      { height: 900, left: 0, top: 0, width: 1200 },
    );

    expect(layout.width).toBe(920);
    expect(layout.height).toBe(575);
  });

  it("keeps card width independent from the loaded image source width", () => {
    const layout = clampPinnedMediaLayout(
      {
        aspectRatio: 1.5,
        height: 180,
        width: 900,
        x: 120,
        y: 80,
        zIndex: 1,
      },
      { height: 900, left: 0, top: 0, width: 1200 },
    );

    expect(layout.width).toBe(900);
    expect(layout.height).toBe(600);
  });

  it("does not shrink a pinned card solely because the source image is tiny", () => {
    const layout = clampPinnedMediaLayout(
      {
        aspectRatio: 1.5,
        height: 180,
        width: 270,
        x: 120,
        y: 80,
        zIndex: 1,
      },
      { height: 900, left: 0, top: 0, width: 1200 },
    );

    expect(layout.width).toBe(270);
    expect(layout.height).toBe(180);
  });

  it("keeps portrait media shrinkable with a square minimum frame", () => {
    const layout = clampPinnedMediaLayout(
      {
        aspectRatio: 0.6,
        height: 300,
        width: 120,
        x: 120,
        y: 80,
        zIndex: 1,
      },
      { height: 900, left: 0, top: 0, width: 1200 },
    );

    expect(layout.aspectRatio).toBe(1);
    expect(layout.width).toBe(120);
    expect(layout.height).toBe(120);
  });

  it("can collapse captions automatically for compact thumbnails", () => {
    const layout = clampPinnedMediaLayout(
      { aspectRatio: 1.6, height: 75, width: 120, x: 10, y: 10, zIndex: 1 },
      { height: 800, left: 0, top: 0, width: 360 },
    );
    expect(layout.width).toBe(120);
    expect(pinnedMediaChromeHeight(layout)).toBe(0);
    expect(pinnedMediaChromeHeight({ ...layout, width: 240 })).toBe(72);
    expect(pinnedMediaChromeHeight({ ...layout, width: 240, captionHidden: true })).toBe(0);
  });

  it("keeps wide media readable with a minimum image height", () => {
    const layout = clampPinnedMediaLayout(
      {
        aspectRatio: 2.4,
        height: 75,
        width: 180,
        x: 120,
        y: 80,
        zIndex: 1,
      },
      { height: 900, left: 0, top: 0, width: 1200 },
    );

    expect(layout.width).toBe(180);
    expect(layout.height).toBe(75);
  });

  it("snaps lightly to map frame edges and other cards", () => {
    const bounds = { height: 900, left: 0, top: 0, width: 1200 };
    const other = {
      aspectRatio: 1.6,
      height: 125,
      width: 200,
      x: 400,
      y: 120,
      zIndex: 1,
    };

    expect(
      snapPinnedMediaLayout(
        {
          aspectRatio: 1.6,
          height: 112.5,
          width: 180,
          x: 391,
          y: 16,
          zIndex: 2,
        },
        [other],
        bounds,
      ),
    ).toMatchObject({ x: 400, y: 12 });
  });

  it("snaps resized card bottom edge without moving its top-left corner", () => {
    const bounds = { height: 900, left: 0, top: 0, width: 1200 };
    const other = {
      aspectRatio: 1.6,
      height: 200,
      width: 320,
      x: 500,
      y: 100,
      zIndex: 1,
    };
    const layout = snapPinnedMediaResizeLayout(
      {
        aspectRatio: 1.6,
        height: 194,
        width: 310,
        x: 100,
        y: 100,
        zIndex: 2,
      },
      [other],
      bounds,
    );

    expect(layout.x).toBe(100);
    expect(layout.y).toBe(100);
    expect(layout.y + layout.height + 72).toBe(other.y + other.height + 72);
  });

  it("uses bottom edge distance for resize snapping on wide media", () => {
    const bounds = { height: 900, left: 0, top: 0, width: 1200 };
    const other = {
      aspectRatio: 1.6,
      height: 150,
      width: 240,
      x: 500,
      y: 100,
      zIndex: 1,
    };
    const layout = snapPinnedMediaResizeLayout(
      {
        aspectRatio: 2.4,
        height: 143,
        width: 343,
        x: 100,
        y: 100,
        zIndex: 2,
      },
      [other],
      bounds,
    );

    expect(layout.x).toBe(100);
    expect(layout.y).toBe(100);
    expect(layout.y + layout.height + 72).toBe(other.y + other.height + 72);
  });

  it("snaps resized card right edge without moving its top-left corner", () => {
    const bounds = { height: 900, left: 0, top: 0, width: 1200 };
    const other = {
      aspectRatio: 1.6,
      height: 160,
      width: 240,
      x: 400,
      y: 320,
      zIndex: 1,
    };
    const layout = snapPinnedMediaResizeLayout(
      {
        aspectRatio: 1.6,
        height: 184,
        width: 294,
        x: 100,
        y: 100,
        zIndex: 2,
      },
      [other],
      bounds,
    );

    expect(layout.x).toBe(100);
    expect(layout.y).toBe(100);
    expect(layout.x + layout.width).toBe(other.x);
  });

  it("creates a compact default card inside the map frame instead of keeping the large modal size", () => {
    const layout = defaultPinnedMediaLayout({
      aspectRatio: 1.5,
      bounds: { height: 900, left: 88, top: 0, width: 1352 },
      existingCards: [],
      sourceRect: {
        height: 700,
        left: 100,
        top: 80,
        width: 1100,
      },
    });

    expect(layout.width).toBeLessThanOrEqual(320);
    expect(layout.height).toBeLessThanOrEqual(214);
    expect(layout.x).toBeGreaterThan(100);
  });

  it("builds a map connection path from the card edge to the place point", () => {
    const geometry = pinnedMediaConnectionGeometry(
      {
        height: 232,
        left: 120,
        top: 80,
        width: 260,
      },
      { x: 620, y: 280 },
    );

    expect(geometry.source).toEqual({ x: 380, y: 280 });
    expect(geometry.target).toEqual({ x: 620, y: 280 });
    expect(geometry.path).toMatch(/^M 380 280 C /);
  });

  it("anchors map connection paths to the nearest card edge when the place sits under the card", () => {
    const geometry = pinnedMediaConnectionGeometry(
      {
        height: 372,
        left: 120,
        top: 80,
        width: 600,
      },
      { x: 560, y: 240 },
    );

    expect(geometry.source).toEqual({ x: 720, y: 240 });
    expect(geometry.target).toEqual({ x: 560, y: 240 });
    expect(geometry.path).not.toContain("M 560 240 C");
  });

  it("uses the measured card frame for lower corner map links", () => {
    const geometry = pinnedMediaConnectionGeometry(
      {
        height: 408,
        left: 90,
        top: 78,
        width: 486,
      },
      { x: 760, y: 540 },
    );

    expect(geometry.source).toEqual({ x: 576, y: 486 });
    expect(geometry.path).toMatch(/^M 576 486 C /);
  });

  it("persists z-order changes", () => {
    const cards = [storedCard(1), storedCard(2), storedCard(3)];
    const updatedCards = bringPinnedMediaCardToFront(cards, cards[0].id);

    expect(updatedCards[0].layout.zIndex).toBeGreaterThan(updatedCards[2].layout.zIndex);
  });
});
