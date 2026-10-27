import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import type { AppConfigMap, PlaceCustomFieldDefinition, PlaceMapItem } from "../../api/types";
import type { MapTourEvent } from "../tour/mapTourSteps";
import { DistanceMeasureTool } from "./DistanceMeasureTool";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";
import { MapTrackpadZoom } from "./MapTrackpadZoom";
import { PinnedMediaBoard, type PinnedMediaPlaceProjector } from "./pinned-media/PinnedMediaBoard";
import { PlaceLayer } from "./PlaceLayer";
import { type PinMediaRequest, usePinnedMediaBoard } from "./pinned-media/usePinnedMediaBoard";

type Props = {
  isAudioAutoplayEnabled: boolean;
  isTourActive?: boolean;
  tourCloseMediaToken?: number;
  tourCloseOverlayToken?: number;
  onTourEvent?: (event: MapTourEvent) => void;
  mapFallback: AppConfigMap;
  markerPlaces: PlaceMapItem[];
  onPinnedMediaVisibleChange: (isVisible: boolean) => void;
  pinnedMediaPlaces: PlaceMapItem[];
  placeCustomFieldDefinitions: PlaceCustomFieldDefinition[];
  showPinnedMedia: boolean;
};

function MapSizeUpdater() {
  const map = useMap();

  useEffect(() => {
    let resizeFrameId: number | null = null;
    const scheduleInvalidate = () => {
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        map.invalidateSize();
      });
    };
    const timeoutId = window.setTimeout(scheduleInvalidate, 250);
    const handleResize = () => scheduleInvalidate();
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleInvalidate());

    window.addEventListener("resize", handleResize);
    resizeObserver?.observe(map.getContainer());
    scheduleInvalidate();

    return () => {
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [map]);

  return null;
}

function MapProjectionTracker({
  onProjectorChange,
}: {
  onProjectorChange: (projector: PinnedMediaPlaceProjector | null) => void;
}) {
  const map = useMap();
  const frameIdRef = useRef<number | null>(null);

  const updateProjector = useCallback(() => {
    if (frameIdRef.current !== null) {
      window.cancelAnimationFrame(frameIdRef.current);
    }

    frameIdRef.current = window.requestAnimationFrame(() => {
      frameIdRef.current = null;
      const containerRect = map.getContainer().getBoundingClientRect();
      const nextProjector: PinnedMediaPlaceProjector = (place) => {
        const point = map.latLngToContainerPoint([place.lat, place.lon]);
        if (point.x < 0 || point.y < 0 || point.x > containerRect.width || point.y > containerRect.height) {
          return null;
        }

        return {
          x: containerRect.left + point.x,
          y: containerRect.top + point.y,
        };
      };

      onProjectorChange(nextProjector);
    });
  }, [map, onProjectorChange]);

  useMapEvents({
    move: updateProjector,
    moveend: updateProjector,
    resize: updateProjector,
    zoom: updateProjector,
    zoomend: updateProjector,
  });

  useEffect(() => {
    updateProjector();

    return () => {
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current);
      }
      onProjectorChange(null);
    };
  }, [onProjectorChange, updateProjector]);

  return null;
}

export function PlaceMap({
  isAudioAutoplayEnabled,
  isTourActive = false,
  tourCloseMediaToken = 0,
  tourCloseOverlayToken = 0,
  onTourEvent,
  mapFallback,
  markerPlaces,
  onPinnedMediaVisibleChange,
  pinnedMediaPlaces,
  placeCustomFieldDefinitions,
  showPinnedMedia,
}: Props) {
  const center: [number, number] = [mapFallback.fallback_center.lat, mapFallback.fallback_center.lon];
  const mapStartKey = `${mapFallback.fallback_center.lat}:${mapFallback.fallback_center.lon}:${mapFallback.fallback_zoom}`;
  const { cards, notice, onBringToFront, onLayoutChange, onMediaSizeChange, onRemove, pinMedia } =
    usePinnedMediaBoard(pinnedMediaPlaces);
  const [projectPlacePoint, setProjectPlacePoint] = useState<PinnedMediaPlaceProjector | null>(null);
  const handleProjectorChange = useCallback((projector: PinnedMediaPlaceProjector | null) => {
    setProjectPlacePoint(() => projector);
  }, []);
  const handlePinMedia = useCallback(
    (request: PinMediaRequest) => {
      const didPin = pinMedia(request);
      onPinnedMediaVisibleChange(true);

      return didPin;
    },
    [onPinnedMediaVisibleChange, pinMedia],
  );

  return (
    <>
      <MapContainer
        center={center}
        zoom={mapFallback.fallback_zoom}
        className="place-map"
        key={mapStartKey}
        scrollWheelZoom={MAP_DISPLAY_CONFIG.mapContainer.scrollWheelZoom}
        zoomDelta={MAP_DISPLAY_CONFIG.mapContainer.zoomDelta}
        zoomControl={MAP_DISPLAY_CONFIG.mapContainer.zoomControl}
        zoomSnap={MAP_DISPLAY_CONFIG.mapContainer.zoomSnap}
      >
        <MapSizeUpdater />
        <MapTrackpadZoom />
        {showPinnedMedia && cards.length > 0 ? (
          <MapProjectionTracker onProjectorChange={handleProjectorChange} />
        ) : null}
        <DistanceMeasureTool />
        <ZoomControl position={MAP_DISPLAY_CONFIG.mapControls.zoomControlPosition} />
        <TileLayer attribution={MAP_DISPLAY_CONFIG.tileLayer.attribution} url={MAP_DISPLAY_CONFIG.tileLayer.url} />
        <PlaceLayer
          isAudioAutoplayEnabled={isAudioAutoplayEnabled}
          isTourActive={isTourActive}
          tourCloseMediaToken={tourCloseMediaToken}
          tourCloseOverlayToken={tourCloseOverlayToken}
          onTourEvent={onTourEvent}
          mapSettings={mapFallback}
          places={markerPlaces}
          placeCustomFieldDefinitions={placeCustomFieldDefinitions}
          onPinMedia={handlePinMedia}
        />
      </MapContainer>
      {showPinnedMedia ? (
        <PinnedMediaBoard
          cards={cards}
          notice={notice}
          onBringToFront={onBringToFront}
          onLayoutChange={onLayoutChange}
          onMediaSizeChange={onMediaSizeChange}
          onRemove={onRemove}
          projectPlacePoint={projectPlacePoint}
        />
      ) : null}
    </>
  );
}
