export type MapTourEvent = "gallery-opened" | "photo-opened" | "layer-toggled";

export type MapTourStep = "welcome" | "place" | "gallery" | "photo" | "layers" | "routes" | "done";

export const MAP_TOUR_STEPS: MapTourStep[] = [
  "welcome",
  "place",
  "gallery",
  "photo",
  "layers",
  "routes",
  "done",
];

export const MAP_TOUR_STORAGE_KEY = "photomap-public-map-tour-v1-complete";

export function nextStepOnEvent(step: MapTourStep, event: MapTourEvent): MapTourStep | null {
  if (step === "place" && event === "gallery-opened") return "gallery";
  if (step === "gallery" && event === "photo-opened") return "photo";
  if (step === "layers" && event === "layer-toggled") return "routes";
  return null;
}

export function nextTourStep(step: MapTourStep): MapTourStep {
  return MAP_TOUR_STEPS[Math.min(MAP_TOUR_STEPS.indexOf(step) + 1, MAP_TOUR_STEPS.length - 1)];
}

export function previousTourStep(step: MapTourStep): MapTourStep {
  return MAP_TOUR_STEPS[Math.max(0, MAP_TOUR_STEPS.indexOf(step) - 1)];
}

export function isTourComplete() {
  try {
    return window.localStorage.getItem(MAP_TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberTourComplete() {
  try {
    window.localStorage.setItem(MAP_TOUR_STORAGE_KEY, "1");
  } catch {
    // The in-memory session state still prevents another prompt this visit.
  }
}
