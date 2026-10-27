import { describe, expect, it } from "vitest";

import { MAP_TOUR_STEPS, nextStepOnEvent, nextTourStep, nextTourStepForPhoto, previousTourStep, previousTourStepForPhoto, skipUnavailableTourStep, tourActionSelector } from "./mapTourSteps";

describe("public map tour flow", () => {
  it("starts with a welcome and ends without escaping the steps", () => {
    expect(MAP_TOUR_STEPS[0]).toBe("welcome");
    expect(nextTourStep("done")).toBe("done");
    expect(previousTourStep("welcome")).toBe("welcome");
  });

  it("only genuine corresponding user actions advance an interactive step", () => {
    expect(nextStepOnEvent("place", "gallery-opened")).toBe("gallery");
    expect(nextStepOnEvent("gallery", "photo-opened")).toBe("photo");
    expect(nextStepOnEvent("layers", "layer-toggled")).toBe("routes");
    expect(nextStepOnEvent("pin", "pin-created")).toBe("pinned");
    expect(nextStepOnEvent("memory", "memory-opened")).toBe("memory-form");
    expect(nextStepOnEvent("photo", "pin-created")).toBeNull();
    expect(nextStepOnEvent("pinned", "memory-opened")).toBeNull();
    expect(nextStepOnEvent("place", "photo-opened")).toBeNull();
    expect(nextStepOnEvent("routes", "layer-toggled")).toBeNull();
  });

  it("skips missing audio while retaining playback guidance where available, including Back", () => {
    expect(nextTourStepForPhoto("photo", false)).toBe("narration");
    expect(nextTourStepForPhoto("photo", true)).toBe("sound");
    expect(nextTourStepForPhoto("sound", false)).toBe("narration");
    expect(previousTourStepForPhoto("narration", false)).toBe("photo");
    expect(previousTourStepForPhoto("narration", true)).toBe("sound");
    expect(previousTourStepForPhoto("pin", false)).toBe("narration");
  });

  it("requires real actions, never choosing one particular tile", () => {
    expect(tourActionSelector("place")).toBe(".place-photo-marker:not(.is-selected) > span");
    expect(tourActionSelector("gallery")).toBe(".photo-gallery-marker > span");
    expect(tourActionSelector("photo")).toBeNull();
    expect(tourActionSelector("sound")).toBeNull();
    expect(tourActionSelector("pinned")).toBeNull();
  });

  it("skips unavailable dependent views without requiring invisible controls", () => {
    expect(skipUnavailableTourStep("place")).toBe("layers");
    expect(skipUnavailableTourStep("gallery")).toBe("layers");
    expect(skipUnavailableTourStep("pin")).toBe("memory");
    expect(skipUnavailableTourStep("memory")).toBe("layers");
    expect(skipUnavailableTourStep("layers")).toBe("routes");
  });

  it("supports manual navigation when no media or controls are available", () => {
    expect(nextTourStep("place")).toBe("gallery");
    expect(previousTourStep("photo")).toBe("gallery");
    expect(nextTourStep("photo")).toBe("sound");
    expect(nextTourStep("narration")).toBe("pin");
    expect(nextTourStep("pinned")).toBe("memory");
    expect(nextTourStep("memory-form")).toBe("layers");
    expect(previousTourStep("memory-form")).toBe("memory");
    expect(MAP_TOUR_STEPS).toHaveLength(13);
  });
});
