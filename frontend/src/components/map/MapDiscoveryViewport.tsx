import { useCallback, useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import type { AppConfigMapMarkerPriority, PlaceMapItem } from "../../api/types";
import { selectMapDiscoveryItems, type MapDiscoveryItem } from "./discoveryRecommendations";

type Props = {
  places: PlaceMapItem[];
  priority: AppConfigMapMarkerPriority;
  onItemsChange: (items: MapDiscoveryItem[]) => void;
};

/** Uses the same filtered map places, without additional HTTP requests. */
export function MapDiscoveryViewport({ places, priority, onItemsChange }: Props) {
  const map = useMap();
  const updateItems = useCallback(() => {
    const bounds = map.getBounds();
    onItemsChange(selectMapDiscoveryItems(places, (place) => bounds.contains([place.lat, place.lon]), priority));
  }, [map, onItemsChange, places, priority]);

  useMapEvents({ moveend: updateItems, zoomend: updateItems, resize: updateItems });
  useEffect(() => {
    updateItems();
  }, [updateItems]);

  return null;
}
