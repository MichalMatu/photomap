import { describe, expect, it } from "vitest";

import {
  approachTrackpadZoom,
  isTrackpadPinchWheelEvent,
  targetZoomFromPinch,
  TRACKPAD_PINCH_ZOOM,
} from "./trackpadZoom";

describe("trackpadZoom", () => {
  it("recognizes desktop pinch without intercepting ordinary scrolling", () => {
    expect(isTrackpadPinchWheelEvent({ ctrlKey: true, deltaMode: 0 })).toBe(true);
    expect(isTrackpadPinchWheelEvent({ ctrlKey: false, deltaMode: 0 })).toBe(false);
    expect(isTrackpadPinchWheelEvent({ ctrlKey: true, deltaMode: 1 })).toBe(false);
  });

  it("responds proportionally to small deltas without quarter-step thresholds", () => {
    expect(targetZoomFromPinch(12, -12, 6, 18)).toBeCloseTo(12.06);
    expect(targetZoomFromPinch(12, 12, 6, 18)).toBeCloseTo(11.94);
    expect(targetZoomFromPinch(12.06, 12, 6, 18)).toBeCloseTo(12);
  });

  it("limits unusually large wheel events without imposing a cooldown", () => {
    const first = targetZoomFromPinch(12, -600, 6, 18);
    expect(first).toBeCloseTo(12 + TRACKPAD_PINCH_ZOOM.maxEventDeltaPx * TRACKPAD_PINCH_ZOOM.zoomPerPixel);
    expect(targetZoomFromPinch(first, -12, 6, 18)).toBeGreaterThan(first);
  });

  it("clamps targets and ignores invalid input", () => {
    expect(targetZoomFromPinch(17.95, -120, 6, 18)).toBe(18);
    expect(targetZoomFromPinch(6.05, 120, 6, 18)).toBe(6);
    expect(targetZoomFromPinch(12, Number.NaN, 6, 18)).toBe(12);
    expect(targetZoomFromPinch(12, Number.POSITIVE_INFINITY, 6, 18)).toBe(12);
    expect(targetZoomFromPinch(12, 0, 6, 18)).toBe(12);
  });

  it("approaches continuously without overshooting or jumping at rest", () => {
    const first = approachTrackpadZoom(12, 12.3);
    expect(first).toBeGreaterThan(12);
    expect(first).toBeLessThan(12.3);
    expect(approachTrackpadZoom(first, 12.3)).toBeGreaterThan(first);
    expect(approachTrackpadZoom(12.2995, 12.3)).toBe(12.3);
    expect(approachTrackpadZoom(12.3, 12.3)).toBe(12.3);
  });
});
