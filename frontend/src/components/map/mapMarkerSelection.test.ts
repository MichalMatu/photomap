import { describe, expect, it } from "vitest";

import type { City, PlaceMapItem } from "../../api/types";

import { hasMapMarkerCollisionOverlaps, resolveMapMarkerCollisions } from "./mapMarkerCollision";
import {
  limitMapMarkersByResolvedDensity,
  selectMapMarkerPlaces,
  type MapMarkerSelectionCandidate,
} from "./mapMarkerSelection";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";
import { filterMapMarkersByViewport } from "./mapMarkerViewport";

function marker(index: number, overrides: Partial<MapMarkerSelectionCandidate> = {}): MapMarkerSelectionCandidate {
  return {
    cityId: "wroclaw",
    height: 64,
    id: `marker-${index}`,
    point: { x: 420, y: 320 },
    priority: 10 - index,
    width: 82,
    ...overrides,
  };
}

describe("limitMapMarkersByResolvedDensity", () => {
  it("keeps locally overlapping markers when collision layout can safely place them", () => {
    const markers = Array.from({ length: 6 }, (_, index) => marker(index));
    const selected = limitMapMarkersByResolvedDensity(markers, {
      viewportHeight: 860,
      viewportWidth: 1280,
      zoom: 13,
    });
    const layouts = resolveMapMarkerCollisions(selected, {
      viewportHeight: 860,
      viewportWidth: 1280,
      zoom: 13,
    });

    expect(selected).toHaveLength(6);
    expect(hasMapMarkerCollisionOverlaps(layouts)).toBe(false);
  });

  it("prunes unresolved collision participants until the layout is clean", () => {
    const markers = Array.from({ length: 8 }, (_, index) => marker(index));
    const selected = limitMapMarkersByResolvedDensity(markers, {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });
    const layouts = resolveMapMarkerCollisions(selected, {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });

    expect(selected.map((item) => item.id)).toContain("marker-0");
    expect(selected.length).toBeLessThan(markers.length);
    expect(hasMapMarkerCollisionOverlaps(layouts)).toBe(false);
  });

  it("keeps isolated lower-priority markers while pruning only the unresolved crowd", () => {
    const crowdedMarkers = Array.from({ length: 8 }, (_, index) => marker(index));
    const isolatedMarker = marker(8, {
      id: "isolated-detail-place",
      point: { x: 80, y: 70 },
      priority: 0.5,
    });
    const selected = limitMapMarkersByResolvedDensity([...crowdedMarkers, isolatedMarker], {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });
    const layouts = resolveMapMarkerCollisions(selected, {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });

    expect(selected.map((item) => item.id)).toContain("isolated-detail-place");
    expect(hasMapMarkerCollisionOverlaps(layouts)).toBe(false);
  });
});

function candidateWithPlace(index: number, point = { x: 260, y: 180 }) {
  const city: City = {
    default_zoom: 13,
    id: "wroclaw",
    lat: 51.1,
    lon: 17.03,
    name: "Wrocław",
    region: "Dolnośląskie",
    sort_order: 0,
    status: "active",
  };
  const place: PlaceMapItem = {
    categories: [],
    category_ids: [],
    city,
    city_id: city.id,
    cover_photo: null,
    custom_fields: {},
    description: null,
    id: `place-${index}`,
    lat: 51.1,
    lon: 17.03,
    memory_count: 0,
    photo_count: 1,
    preview_items: [],
    score: 1,
    slug: `place-${index}`,
    title: `Place ${index}`,
    weight: index % 5 === 0 ? 5 : 1,
  };

  return {
    ...marker(index, { point, id: place.id }),
    place,
  };
}

const modeSelectionOptions = {
  markerDensity: MAP_DISPLAY_CONFIG.fallback.emptyCountryMap.marker_density,
  markerPriority: MAP_DISPLAY_CONFIG.fallback.emptyCountryMap.marker_priority,
  viewportHeight: 400,
  viewportWidth: 520,
  zoom: 11,
};

describe("map marker selection by display mode", () => {
  it("shows all visible pins regardless of photo-tile density, overlap, priority or cover", () => {
    const candidates = Array.from({ length: 40 }, (_, index) => candidateWithPlace(index));
    const pins = selectMapMarkerPlaces(candidates, { ...modeSelectionOptions, markerMode: "pins" });
    const photos = selectMapMarkerPlaces(candidates, { ...modeSelectionOptions, markerMode: "photos" });

    expect(pins).toBe(candidates);
    expect(pins.map((candidate) => candidate.id)).toEqual(candidates.map((candidate) => candidate.id));
    expect(photos.length).toBeLessThan(candidates.length);
  });

  it("limits pin rendering only to the map viewport and restores the tile policy on mode switch", () => {
    const candidates = [
      candidateWithPlace(0, { x: 0, y: 0 }),
      candidateWithPlace(1, { x: 520, y: 400 }),
      candidateWithPlace(2, { x: -10, y: 100 }),
      candidateWithPlace(3, { x: 600, y: 100 }),
    ];
    const visible = filterMapMarkersByViewport(candidates, modeSelectionOptions);

    expect(
      selectMapMarkerPlaces(visible, { ...modeSelectionOptions, markerMode: "pins" }).map((item) => item.id),
    ).toEqual(["place-0", "place-1"]);
    expect(
      selectMapMarkerPlaces(
        Array.from({ length: 40 }, (_, index) => candidateWithPlace(index)),
        { ...modeSelectionOptions, markerMode: "photos" },
      ).length,
    ).toBeLessThan(40);
  });
});
