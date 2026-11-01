export type MapMarkerMode = "photos" | "pins";

export const MAP_MARKER_MODE_STORAGE_KEY = "photomap:map-marker-mode:v1";

export function readMapMarkerMode(storage: Pick<Storage, "getItem"> | null = getStorage()): MapMarkerMode {
  try {
    return storage?.getItem(MAP_MARKER_MODE_STORAGE_KEY) === "pins" ? "pins" : "photos";
  } catch {
    return "photos";
  }
}

export function writeMapMarkerMode(mode: MapMarkerMode, storage: Pick<Storage, "setItem"> | null = getStorage()) {
  try {
    storage?.setItem(MAP_MARKER_MODE_STORAGE_KEY, mode);
  } catch {
    // Storage may be disabled in restricted browsers.
  }
}

function getStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
