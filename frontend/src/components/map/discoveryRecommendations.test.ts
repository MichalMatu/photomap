import { describe, expect, it } from "vitest";

import type { AppConfigMapMarkerPriority, PlaceMapItem } from "../../api/types";
import { selectMapDiscoveryItems } from "./discoveryRecommendations";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const priority: AppConfigMapMarkerPriority = MAP_DISPLAY_CONFIG.fallback.emptyCountryMap.marker_priority;
function makePlace(id: string, weight: number, hasPhoto = true): PlaceMapItem {
  return {
    id,
    slug: id,
    title: id,
    city_id: "city-1",
    description: null,
    category_ids: [],
    categories: [],
    custom_fields: {},
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
    weight,
    photo_count: hasPhoto ? 1 : 0,
    memory_count: 0,
    score: 0,
    lat: 51.1,
    lon: 17.03,
    cover_photo: hasPhoto
      ? {
          id: `photo-${id}`,
          place_id: id,
          public_path: `/media/${id}.jpg`,
          thumb_path: `/media/${id}-thumb.jpg`,
          role: "cover",
          source: "editorial",
          caption: null,
          attribution_author: null,
          attribution_source_url: null,
          attribution_license: null,
          attribution_license_url: null,
          audio: null,
          created_at: "2026-11-01T00:00:00",
          approved_at: null,
        }
      : null,
    preview_items: [],
  } as PlaceMapItem;
}

describe("map discovery drawer recommendations", () => {
  it("selects visible cover photos in configured editorial priority order", () => {
    const items = selectMapDiscoveryItems(
      [makePlace("low", 1), makePlace("outside", 10), makePlace("high", 6), makePlace("empty", 3, false)],
      (place) => place.id !== "outside",
      priority,
    );
    expect(items.map(({ place }) => place.id)).toEqual(["high", "low"]);
  });

  it("deduplicates places, never includes places without a photo, and limits suggestions", () => {
    const items = selectMapDiscoveryItems(
      [makePlace("a", 2), makePlace("a", 2), makePlace("b", 1), makePlace("empty", 4, false)],
      () => true,
      priority,
      1,
    );
    expect(items.map(({ place }) => place.id)).toEqual(["a"]);
  });
});
