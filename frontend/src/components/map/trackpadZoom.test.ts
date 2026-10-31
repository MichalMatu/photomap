import { describe, expect, it } from "vitest";

import {
  approachTrackpadZoom,
  isSmoothTrackpadZoomEvent,
  isTrackpadPinchWheelEvent,
  targetZoomFromPinch,
  TRACKPAD_PINCH_ZOOM,
} from "./trackpadZoom";

describe("trackpadZoom", () => {
  it("recognizes pinch and fine two-finger scroll without intercepting mouse wheel", () => {
    expect(isTrackpadPinchWheelEvent({ ctrlKey: true, deltaMode: 0, deltaY: -10 })).toBe(true);
    expect(isTrackpadPinchWheelEvent({ ctrlKey: false, deltaMode: 0, deltaY: -10 })).toBe(false);
    expect(isSmoothTrackpadZoomEvent({ ctrlKey: true, deltaMode: 0, deltaY: 100 })).toBe(true);
    expect(isSmoothTrackpadZoomEvent({ ctrlKey: false, deltaMode: 0, deltaY: 12 })).toBe(true);
    expect(isSmoothTrackpadZoomEvent({ ctrlKey: false, deltaMode: 0, deltaY: 100 })).toBe(false);
    expect(isSmoothTrackpadZoomEvent({ ctrlKey: false, deltaMode: 0, deltaY: 100 }, true)).toBe(true);
    expect(isSmoothTrackpadZoomEvent({ ctrlKey: false, deltaMode: 1, deltaY: 2 })).toBe(false);
    expect(isSmoothTrackpadZoomEvent({ ctrlKey: false, deltaMode: 0, deltaY: 0 })).toBe(false);
  });

  it("responds proportionally to either direction without quantized steps", () => {
    expect(targetZoomFromPinch(12, -12, 6, 18)).toBeCloseTo(12.06);
    expect(targetZoomFromPinch(12, 12, 6, 18)).toBeCloseTo(11.94);
    expect(targetZoomFromPinch(12.06, 12, 6, 18)).toBeCloseTo(12);
  });

  it("bounds exceptional events but does not block subsequent input", () => {
    const first = targetZoomFromPinch(12, 600, 6, 18);
    expect(first).toBeCloseTo(12 - TRACKPAD_PINCH_ZOOM.maxEventDeltaPx * TRACKPAD_PINCH_ZOOM.zoomPerPixel);
    expect(targetZoomFromPinch(first, 8, 6, 18)).toBeLessThan(first);
  });

  it("clamps zoom bounds and rejects invalid values", () => {
    expect(targetZoomFromPinch(17.95, -120, 6, 18)).toBe(18);
    expect(targetZoomFromPinch(6.05, 120, 6, 18)).toBe(6);
    expect(targetZoomFromPinch(12, Number.NaN, 6, 18)).toBe(12);
    expect(targetZoomFromPinch(12, Number.POSITIVE_INFINITY, 6, 18)).toBe(12);
  });

  it("approaches smoothly without overshoot", () => {
    const first = approachTrackpadZoom(12, 12.3);
    expect(first).toBeGreaterThan(12);
    expect(first).toBeLessThan(12.3);
    expect(approachTrackpadZoom(first, 12.3)).toBeGreaterThan(first);
    expect(approachTrackpadZoom(12.2999, 12.3)).toBe(12.3);
  });
});
