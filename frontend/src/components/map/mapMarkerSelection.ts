import type { AppConfigMap, PlaceMapItem } from "../../api/types";
import { limitMapMarkersByDensity } from "./mapMarkerDensity";
import type { MapMarkerMode } from "./mapMarkerMode";
import { mapMarkerCollisionOverlapIds, resolveMapMarkerCollisions } from "./mapMarkerCollision";
import { limitMapMarkersByScreenDensity, type ScreenDensityCandidate } from "./mapMarkerScreenDensity";

export type MapMarkerSelectionCandidate = ScreenDensityCandidate;

type MapMarkerSelectionOptions = {
  viewportHeight: number;
  viewportWidth: number;
  zoom: number;
};

export function limitMapMarkersByResolvedDensity<TCandidate extends MapMarkerSelectionCandidate>(
  candidates: TCandidate[],
  options: MapMarkerSelectionOptions,
): TCandidate[] {
  if (candidates.length <= 1) {
    return candidates;
  }

  const originalIndexById = new Map(candidates.map((candidate, index) => [candidate.id, index]));
  let selected = [...candidates];

  while (selected.length > 1) {
    const collisionLayouts = resolveMapMarkerCollisions(
      selected.map((candidate) => ({
        height: candidate.height,
        id: candidate.id,
        point: candidate.point,
        priority: candidate.priority,
        width: candidate.width,
      })),
      options,
    );
    const overlappingIds = mapMarkerCollisionOverlapIds(collisionLayouts);

    if (overlappingIds.size === 0) {
      return selected;
    }

    const candidateToRemove = selected
      .filter((candidate) => overlappingIds.has(candidate.id))
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          (originalIndexById.get(right.id) ?? 0) - (originalIndexById.get(left.id) ?? 0),
      )[0];

    if (!candidateToRemove) {
      return limitMapMarkersByScreenDensity(selected);
    }

    selected = selected.filter((candidate) => candidate.id !== candidateToRemove.id);
  }

  return selected;
}

export type MapMarkerPlaceCandidate = MapMarkerSelectionCandidate & { place: PlaceMapItem };

type MapMarkerModeSelectionOptions = MapMarkerSelectionOptions & {
  markerDensity: AppConfigMap["marker_density"];
  markerMode: MapMarkerMode;
  markerPriority: AppConfigMap["marker_priority"];
};

// Pins identify every location in the viewport; only photo tiles need density and collision pruning.
export function selectMapMarkerPlaces<TCandidate extends MapMarkerPlaceCandidate>(
  candidates: TCandidate[],
  options: MapMarkerModeSelectionOptions,
): TCandidate[] {
  if (options.markerMode === "pins") {
    return candidates;
  }

  const densityPlaces = limitMapMarkersByDensity(
    candidates.map((candidate) => candidate.place),
    {
      markerDensity: options.markerDensity,
      markerPriority: options.markerPriority,
      viewportHeight: options.viewportHeight,
      viewportWidth: options.viewportWidth,
      zoom: options.zoom,
    },
  );
  const densityPlaceIds = new Set(densityPlaces.map((place) => place.id));
  const densityCandidates = candidates.filter((candidate) => densityPlaceIds.has(candidate.place.id));
  return limitMapMarkersByResolvedDensity(densityCandidates, options);
}
