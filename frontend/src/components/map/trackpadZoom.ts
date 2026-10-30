const PIXEL_DELTA_MODE = 0;

export const TRACKPAD_PINCH_ZOOM = {
  idleResetMs: 180,
  maxEventDeltaPx: 120,
  zoomPerPixel: 1 / 200,
  smoothingFactor: 0.4,
  settleEpsilon: 0.002,
} as const;

type TrackpadWheelLike = Pick<WheelEvent, "ctrlKey" | "deltaMode">;

export function isTrackpadPinchWheelEvent(event: TrackpadWheelLike): boolean {
  return event.ctrlKey && event.deltaMode === PIXEL_DELTA_MODE;
}

export function targetZoomFromPinch(currentTarget: number, deltaY: number, minZoom: number, maxZoom: number): number {
  if (!Number.isFinite(deltaY) || !Number.isFinite(currentTarget) || deltaY === 0) {
    return currentTarget;
  }

  const boundedDelta = Math.max(
    -TRACKPAD_PINCH_ZOOM.maxEventDeltaPx,
    Math.min(TRACKPAD_PINCH_ZOOM.maxEventDeltaPx, deltaY),
  );
  return Math.max(minZoom, Math.min(maxZoom, currentTarget - boundedDelta * TRACKPAD_PINCH_ZOOM.zoomPerPixel));
}

export function approachTrackpadZoom(current: number, target: number): number {
  if (Math.abs(target - current) <= TRACKPAD_PINCH_ZOOM.settleEpsilon) {
    return target;
  }

  const next = current + (target - current) * TRACKPAD_PINCH_ZOOM.smoothingFactor;
  return Math.abs(target - next) <= TRACKPAD_PINCH_ZOOM.settleEpsilon ? target : next;
}
