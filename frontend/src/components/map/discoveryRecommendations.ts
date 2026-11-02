import type { AppConfigMapMarkerPriority, PlaceMapItem } from "../../api/types";
import { getMapPlacePriority } from "./mapMarkerDensity";
import { getPlacePreviewVisual, type PlaceMapVisualItem } from "./placePreview";

export type MapDiscoveryItem = { place: PlaceMapItem; item: PlaceMapVisualItem };

/** Cover-only viewport suggestions: never fetch a complete place gallery for the dock. */
export function selectMapDiscoveryItems(
  places: PlaceMapItem[],
  isVisible: (place: PlaceMapItem) => boolean,
  priority: AppConfigMapMarkerPriority,
  limit = 12,
): MapDiscoveryItem[] {
  const seenPlaces = new Set<string>();
  return places
    .filter((place) => {
      if (seenPlaces.has(place.id) || !isVisible(place)) return false;
      seenPlaces.add(place.id);
      return true;
    })
    .map((place) => ({ place, item: getPlacePreviewVisual(place) }))
    .filter((entry): entry is MapDiscoveryItem => entry.item?.kind === "photo" && Boolean(entry.item.thumb_path))
    .sort(
      (a, b) =>
        getMapPlacePriority(b.place, priority) - getMapPlacePriority(a.place, priority) ||
        a.place.id.localeCompare(b.place.id),
    )
    .slice(0, limit);
}
