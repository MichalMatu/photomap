import { useEffect } from "react";
import { useMap } from "react-leaflet";

import { approachTrackpadZoom, isTrackpadPinchWheelEvent, targetZoomFromPinch, TRACKPAD_PINCH_ZOOM } from "./trackpadZoom";

export function MapTrackpadZoom() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let targetZoom: number | null = null;
    let cursorPoint: ReturnType<typeof map.mouseEventToContainerPoint> | null = null;
    let originalZoomSnap: number | null = null;
    let frameId: number | null = null;
    let resetTimerId: number | null = null;
    let gestureEnded = false;

    const restoreZoomSnap = () => {
      if (originalZoomSnap !== null) {
        map.options.zoomSnap = originalZoomSnap;
        originalZoomSnap = null;
      }
      targetZoom = null;
      cursorPoint = null;
      gestureEnded = false;
    };

    const animateZoom = () => {
      frameId = null;
      if (targetZoom === null || cursorPoint === null) {
        return;
      }
      if (!map.scrollWheelZoom.enabled()) {
        restoreZoomSnap();
        return;
      }

      const current = map.getZoom();
      const next = approachTrackpadZoom(current, targetZoom);
      if (next !== current) {
        map.setZoomAround(cursorPoint, next, { animate: false });
      }
      if (next !== targetZoom) {
        frameId = window.requestAnimationFrame(animateZoom);
      } else if (gestureEnded) {
        restoreZoomSnap();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (!isTrackpadPinchWheelEvent(event)) {
        if (originalZoomSnap !== null) {
          if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
            frameId = null;
          }
          if (resetTimerId !== null) {
            window.clearTimeout(resetTimerId);
            resetTimerId = null;
          }
          restoreZoomSnap();
        }
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      if (!map.scrollWheelZoom.enabled()) {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
          frameId = null;
        }
        restoreZoomSnap();
        return;
      }

      if (originalZoomSnap === null) {
        originalZoomSnap = map.options.zoomSnap ?? 1;
        map.options.zoomSnap = 0;
      }
      if (resetTimerId !== null) {
        window.clearTimeout(resetTimerId);
      }
      gestureEnded = false;
      targetZoom = targetZoomFromPinch(
        targetZoom ?? map.getZoom(),
        event.deltaY,
        map.getMinZoom(),
        map.getMaxZoom(),
      );
      cursorPoint = map.mouseEventToContainerPoint(event);
      if (frameId === null) {
        frameId = window.requestAnimationFrame(animateZoom);
      }
      resetTimerId = window.setTimeout(() => {
        resetTimerId = null;
        gestureEnded = true;
        if (frameId === null) {
          restoreZoomSnap();
        }
      }, TRACKPAD_PINCH_ZOOM.idleResetMs);
    };

    container.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel, { capture: true });
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (resetTimerId !== null) {
        window.clearTimeout(resetTimerId);
      }
      restoreZoomSnap();
    };
  }, [map]);

  return null;
}
