import type { PlaceMapItem } from "../../api/types";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const FEATURED_PLACE_WEIGHT = MAP_DISPLAY_CONFIG.layers.featuredPlaceWeight;

export type MapLayerControlId = "all" | "places" | "featured" | "memories";

export type MapLayerState = {
  featured: boolean;
  memories: boolean;
  places: boolean;
};

export const DEFAULT_MAP_LAYER_STATE: MapLayerState = {
  featured: true,
  memories: true,
  places: true,
};

export const EMPTY_MAP_LAYER_STATE: MapLayerState = {
  featured: false,
  memories: false,
  places: false,
};

export const MAP_LAYER_CONTROLS: Array<{ id: MapLayerControlId; label: string }> = [
  { id: "all", label: "Wszystkie" },
  { id: "featured", label: "Polecane" },
  { id: "places", label: "Miejsca" },
  { id: "memories", label: "Pamiątki" },
];

export function isAllMapLayerPresetActive(state: MapLayerState) {
  return state.featured && state.places && state.memories;
}

export function hasAnyMapLayerActive(state: MapLayerState) {
  return state.featured || state.places || state.memories;
}

function isFeaturedMapPlace(place: PlaceMapItem) {
  return place.weight >= FEATURED_PLACE_WEIGHT;
}

function placeHasMemories(place: PlaceMapItem) {
  return place.memory_count > 0 || place.preview_items.some((item) => item.kind === "memory");
}

function countPlaceMemories(place: PlaceMapItem) {
  const previewMemoryCount = place.preview_items.filter((item) => item.kind === "memory").length;
  return Math.max(place.memory_count, previewMemoryCount);
}

export function toggleMapLayer(state: MapLayerState, layerId: MapLayerControlId): MapLayerState {
  if (layerId === "all") {
    return isAllMapLayerPresetActive(state) ? EMPTY_MAP_LAYER_STATE : DEFAULT_MAP_LAYER_STATE;
  }

  if (isAllMapLayerPresetActive(state)) {
    return {
      featured: layerId === "featured",
      memories: layerId === "memories",
      places: layerId === "places",
    };
  }

  const nextState = {
    ...state,
    [layerId]: !state[layerId],
  };

  if (!hasAnyMapLayerActive(nextState)) {
    return DEFAULT_MAP_LAYER_STATE;
  }

  if (isAllMapLayerPresetActive(nextState)) {
    return DEFAULT_MAP_LAYER_STATE;
  }

  return nextState;
}

export function isMapLayerControlActive(state: MapLayerState, layerId: MapLayerControlId) {
  if (layerId === "all") {
    return isAllMapLayerPresetActive(state);
  }

  if (layerId === "featured") {
    return !isAllMapLayerPresetActive(state) && state.featured;
  }

  if (layerId === "places") {
    return !isAllMapLayerPresetActive(state) && state.places;
  }

  return !isAllMapLayerPresetActive(state) && state.memories;
}

function placeMatchesMapLayerState(place: PlaceMapItem, state: MapLayerState) {
  if (isAllMapLayerPresetActive(state)) {
    return true;
  }

  const includesPlaceContent = state.places || (state.featured && isFeaturedMapPlace(place));
  const includesMemoryContent = state.memories && placeHasMemories(place);

  return includesPlaceContent || includesMemoryContent;
}

function filterMapPlaceContent(place: PlaceMapItem, state: MapLayerState): PlaceMapItem {
  const includesPlaceContent = state.places || (state.featured && isFeaturedMapPlace(place));
  const includesMemoryContent = state.memories;

  if (includesPlaceContent && includesMemoryContent) {
    return place;
  }

  return {
    ...place,
    preview_items: place.preview_items.filter((item) => {
      if (item.kind === "memory") {
        return includesMemoryContent;
      }
      return includesPlaceContent;
    }),
  };
}

export function filterMapPlaces(places: PlaceMapItem[], state: MapLayerState) {
  return places
    .filter((place) => placeMatchesMapLayerState(place, state))
    .map((place) => filterMapPlaceContent(place, state));
}

export function countMapLayerPlaces(places: PlaceMapItem[]): Record<MapLayerControlId, number> {
  const memoryCount = places.reduce((total, place) => total + countPlaceMemories(place), 0);

  return {
    all: places.length + memoryCount,
    featured: places.filter(isFeaturedMapPlace).length,
    memories: memoryCount,
    places: places.length,
  };
}
