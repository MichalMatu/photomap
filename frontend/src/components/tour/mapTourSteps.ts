export type MapTourEvent = "gallery-opened" | "photo-opened" | "pin-created" | "memory-opened" | "layer-toggled";

export type MapTourStep = "welcome" | "place" | "gallery" | "photo" | "sound" | "narration" | "pin" | "pinned" | "memory" | "memory-form" | "layers" | "routes" | "done";

export const MAP_TOUR_STEPS: MapTourStep[] = [
  "welcome",
  "place",
  "gallery",
  "photo",
  "sound",
  "narration",
  "pin",
  "pinned",
  "memory",
  "memory-form",
  "layers",
  "routes",
  "done",
];

export const MAP_TOUR_STORAGE_KEY = "photomap-public-map-tour-v3-complete";

// These selectors only check whether an action exists. The guide never singles
// out a marker or intercepts clicks: visitors choose any visible item.
const ACTION_SELECTORS: Partial<Record<MapTourStep, string>> = {
  place: ".place-photo-marker:not(.is-selected) > span",
  gallery: ".photo-gallery-marker > span",
  pin: '.system-modal--media button[aria-label^="Przypnij"]',
  memory: ".photo-gallery-add-marker > span",
  layers: "#app-side-drawer .drawer-section--layers button",
};

export function tourActionSelector(step: MapTourStep): string | null {
  return ACTION_SELECTORS[step] ?? null;
}

// Skip only when the required control truly is unavailable, avoiding a series
// of explanations for already-closed galleries or dialogs.
export function skipUnavailableTourStep(step: MapTourStep): MapTourStep {
  switch (step) {
    case "place":
    case "gallery":
    case "memory":
      return "layers";
    case "pin":
      return "memory";
    case "layers":
      return "routes";
    default:
      return nextTourStep(step);
  }
}

export function nextStepOnEvent(step: MapTourStep, event: MapTourEvent): MapTourStep | null {
  if (step === "place" && event === "gallery-opened") return "gallery";
  if (step === "gallery" && event === "photo-opened") return "photo";
  if (step === "pin" && event === "pin-created") return "pinned";
  if (step === "memory" && event === "memory-opened") return "memory-form";
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
