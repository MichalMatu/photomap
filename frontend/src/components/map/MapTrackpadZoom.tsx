import { useEffect } from "react";
import type { LatLng, Map as LeafletMap, Point } from "leaflet";
import { useMap } from "react-leaflet";

import {
  approachTrackpadZoom,
  isSmoothTrackpadZoomEvent,
  targetZoomFromPinch,
  TRACKPAD_PINCH_ZOOM,
} from "./trackpadZoom";

type ContinuousZoomMap = LeafletMap & {
  _moveStart: (zoomChanged: boolean, noMoveStart?: boolean) => LeafletMap;
  _move: (center: LatLng, zoom: number, data: { pinch: boolean; round: boolean }) => LeafletMap;
  _moveEnd: (zoomChanged: boolean) => LeafletMap;
};

type DiagnosticMapContainer = HTMLElement & { __photomapDebugMap?: LeafletMap };

export function MapTrackpadZoom() {
  const map = useMap() as ContinuousZoomMap;

  useEffect(() => {
    const container = map.getContainer() as DiagnosticMapContainer;
    if (import.meta.env.DEV) {
      container.__photomapDebugMap = map;
    }
    let targetZoom: number | null = null;
    let anchor: Point | null = null;
    let originalSnap: number | null = null;
    let frameId: number | null = null;
    let resetTimer: number | null = null;
    let started = false;
    let gestureEnded = false;

    const endGesture = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }
      if (started) {
        started = false;
        map._moveEnd(true);
      }
      if (originalSnap !== null) {
        map.options.zoomSnap = originalSnap;
        originalSnap = null;
      }
      targetZoom = null;
      anchor = null;
      gestureEnded = false;
    };

    const animateZoom = () => {
      frameId = null;
      if (targetZoom === null || anchor === null) {
        return;
      }
      if (!map.scrollWheelZoom.enabled()) {
        endGesture();
        return;
      }
      const current = map.getZoom();
      const next = approachTrackpadZoom(current, targetZoom);
      if (next !== current) {
        if (!started) {
          map.stop();
          map._moveStart(true);
          started = true;
        }

        // Same cursor-centered projection as Leaflet setZoomAround, without
        // ending the gesture and re-layouting every marker each animation frame.
        const scale = map.getZoomScale(next, current);
        const half = map.getSize().divideBy(2);
        const offset = anchor.subtract(half).multiplyBy(1 - 1 / scale);
        const center = map.containerPointToLatLng(half.add(offset));
        map._move(center, next, { pinch: true, round: false });
      }
      if (next !== targetZoom) {
        frameId = window.requestAnimationFrame(animateZoom);
      } else if (gestureEnded) {
        endGesture();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (!isSmoothTrackpadZoomEvent(event, originalSnap !== null)) {
        // Do not let the native wheel handler interleave with a half-finished pinch.
        if (originalSnap !== null) {
          endGesture();
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!map.scrollWheelZoom.enabled()) {
        endGesture();
        return;
      }
      if (originalSnap === null) {
        originalSnap = map.options.zoomSnap ?? 1;
        map.options.zoomSnap = 0;
      }
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
      }
      gestureEnded = false;
      targetZoom = targetZoomFromPinch(targetZoom ?? map.getZoom(), event.deltaY, map.getMinZoom(), map.getMaxZoom());
      anchor = map.mouseEventToContainerPoint(event);
      if (frameId === null) {
        frameId = window.requestAnimationFrame(animateZoom);
      }
      resetTimer = window.setTimeout(() => {
        resetTimer = null;
        gestureEnded = true;
        if (frameId === null) {
          endGesture();
        }
      }, TRACKPAD_PINCH_ZOOM.idleResetMs);
    };

    container.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel, { capture: true });
      endGesture();
      if (import.meta.env.DEV) {
        delete container.__photomapDebugMap;
      }
    };
  }, [map]);

  return null;
}
