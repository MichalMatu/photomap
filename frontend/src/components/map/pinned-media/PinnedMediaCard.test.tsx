import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Category, PlaceMapItem, PlaceMapPhoto } from "../../../api/types";
import { PinnedMediaCard } from "./PinnedMediaCard";
import type { ResolvedPinnedMediaCard } from "./pinnedMediaBoardTypes";

function category(): Category {
  return {
    description: null,
    icon: null,
    id: "category-1",
    label: "Detal",
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
    custom_fields: {},
    description: "Opis miejsca",
    id: "place-1",
    lat: 51.1,
    lon: 17.03,
    memory_count: 1,
    photo_count: 2,
    preview_items: [{ ...photo("photo-2"), kind: "photo" as const }],
    score: 12,
    slug: "miejsce",
    title: "Miejsce",
    weight: 1,
  };
}

function card(overrides: Partial<ResolvedPinnedMediaCard> = {}): ResolvedPinnedMediaCard {
  const item = { ...photo("photo-2"), kind: "photo" as const };
  return {
    createdAt: 1_000,
    id: "place-1:photo:photo-2",
    item,
    itemId: item.id,
    kind: "photo",
    layout: {
      aspectRatio: 1.6,
      height: 150,
      width: 240,
      x: 24,
      y: 36,
      zIndex: 1,
    },
    place: place(),
    placeId: "place-1",
    ...overrides,
  };
}

describe("PinnedMediaCard", () => {
  it("renders a keyboard-safe map link toggle action", () => {
    const markup = renderToStaticMarkup(
      <PinnedMediaCard
        card={card()}
        cardRef={() => undefined}
        isActive={false}
        isLinked={false}
        onBringToFront={vi.fn()}
        onMediaSizeChange={vi.fn()}
        onRemove={vi.fn()}
        onToggleCaption={vi.fn()}
        onStartInteraction={vi.fn()}
        onToggleMapLink={vi.fn()}
      />,
    );

    expect(markup).toContain('class="pinned-media-card-map-link"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-label="Pokaż miejsce na mapie: Miejsce"');
  });

  it("collapses the description for small cards", () => {
    const markup = renderToStaticMarkup(<PinnedMediaCard card={card({layout: {...card().layout, width: 120, height: 75}})} cardRef={() => undefined} isActive={false} isLinked={false} onBringToFront={vi.fn()} onMediaSizeChange={vi.fn()} onRemove={vi.fn()} onToggleCaption={vi.fn()} onStartInteraction={vi.fn()} onToggleMapLink={vi.fn()} />);
    expect(markup).toContain("is-copy-hidden");
    expect(markup).toContain("Pokaż opis przypiętego zdjęcia");
    expect(markup).not.toContain("pinned-media-card-copy");
  });

  it("marks the map link action as pressed when linked", () => {
    const markup = renderToStaticMarkup(
      <PinnedMediaCard
        card={card()}
        cardRef={() => undefined}
        isActive={false}
        isLinked
        onBringToFront={vi.fn()}
        onMediaSizeChange={vi.fn()}
        onRemove={vi.fn()}
        onToggleCaption={vi.fn()}
        onStartInteraction={vi.fn()}
        onToggleMapLink={vi.fn()}
      />,
    );

    expect(markup).toContain('class="pinned-media-card-map-link is-active"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-label="Ukryj połączenie z mapą: Miejsce"');
  });
});
