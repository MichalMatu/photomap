import { describe, expect, it } from "vitest";

import { MAP_TOUR_STEPS, nextStepOnEvent, nextTourStep, previousTourStep } from "./mapTourSteps";

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
    expect(nextStepOnEvent("place", "photo-opened")).toBeNull();
    expect(nextStepOnEvent("routes", "layer-toggled")).toBeNull();
  });

  it("supports manual navigation when no media or controls are available", () => {
    expect(nextTourStep("place")).toBe("gallery");
    expect(previousTourStep("photo")).toBe("gallery");
  });
});
