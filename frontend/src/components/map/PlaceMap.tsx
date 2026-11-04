import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import type { AppConfigMap, PlaceCustomFieldDefinition, PlaceMapItem } from "../../api/types";
import type { MapTourEvent } from "../tour/mapTourSteps";
import { DistanceMeasureTool } from "./DistanceMeasureTool";
import { MapDiscoveryViewport } from "./MapDiscoveryViewport";
import type { MapDiscoveryItem } from "./discoveryRecommendations";
import { MapAttribution } from "./MapAttribution";
import type { PlaceVisualTarget } from "./usePlaceGalleryData";
import type { ResolvedPinnedMediaCard } from "./pinned-media/pinnedMediaBoardTypes";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";
import type { MapMarkerMode } from "./mapMarkerMode";
import { MapTrackpadZoom } from "./MapTrackpadZoom";
import { PinnedMediaBoard, type PinnedMediaPlaceProjector } from "./pinned-media/PinnedMediaBoard";
import type { PinnedMediaDrawerStage } from "./pinned-media/pinnedMediaDrawerStage";
import { PlaceLayer } from "./PlaceLayer";
import { type PinMediaRequest, usePinnedMediaBoard } from "./pinned-media/usePinnedMediaBoard";

type Props = {
  isAudioAutoplayEnabled: boolean;
  onInitialTilesReady?: () => void;
  isTourActive?: boolean;
  tourCloseMediaToken?: number;
  tourCloseOverlayToken?: number;
  onTourEvent?: (event: MapTourEvent) => void;
  mapFallback: AppConfigMap;
  markerPlaces: PlaceMapItem[];
  markerMode: MapMarkerMode;
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

function MapDrawerInset({ stage }: { stage: PinnedMediaDrawerStage }) {
  const map = useMap();

  useEffect(() => {
    const element = map.getContainer();
    element.classList.toggle("place-map--drawer-open", stage !== "collapsed");
    element.classList.toggle("place-map--drawer-discovery", stage === "discovery");
    map.invalidateSize();
    return () => {
      element.classList.remove("place-map--drawer-open");
      element.classList.remove("place-map--drawer-discovery");
    };
  }, [stage, map]);

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
  onInitialTilesReady,
  isTourActive = false,
  tourCloseMediaToken = 0,
  tourCloseOverlayToken = 0,
  onTourEvent,
  mapFallback,
  markerPlaces,
  markerMode,
  onPinnedMediaVisibleChange,
  pinnedMediaPlaces,
  placeCustomFieldDefinitions,
  showPinnedMedia,
}: Props) {
  const center: [number, number] = [mapFallback.fallback_center.lat, mapFallback.fallback_center.lon];
  const mapStartKey = `${mapFallback.fallback_center.lat}:${mapFallback.fallback_center.lon}:${mapFallback.fallback_zoom}`;
  const { cards, notice, onBringToFront, onDock, onUndock, onLayoutChange, onMediaSizeChange, onRemove, pinMedia } =
    usePinnedMediaBoard(pinnedMediaPlaces);
  const [pinnedDrawerStage, setPinnedDrawerStage] = useState<PinnedMediaDrawerStage>("collapsed");
  const [recommendedItems, setRecommendedItems] = useState<MapDiscoveryItem[]>([]);
  const [recommendedPlaceRequest, setRecommendedPlaceRequest] = useState<{ placeId: string; serial: number } | null>(
    null,
  );
  const hasDrawerContent = cards.some((card) => card.docked) || recommendedItems.length > 0;
  const visibleDrawerStage = showPinnedMedia && hasDrawerContent ? pinnedDrawerStage : "collapsed";
  const handleDiscoveryChange = useCallback((items: MapDiscoveryItem[]) => {
    setRecommendedItems((current) =>
      current.length === items.length &&
      current.every(
        (entry, index) => entry.place.id === items[index].place.id && entry.item.id === items[index].item.id,
      )
        ? current
        : items,
    );
  }, []);
  const [pinnedPreview, setPinnedPreview] = useState<{
    card: ResolvedPinnedMediaCard;
    target: PlaceVisualTarget;
  } | null>(null);
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
        attributionControl={false}
        zoomSnap={MAP_DISPLAY_CONFIG.mapContainer.zoomSnap}
      >
        <MapSizeUpdater />
        <MapDiscoveryViewport
          places={markerPlaces}
          priority={mapFallback.marker_priority}
          onItemsChange={handleDiscoveryChange}
        />
        <MapDrawerInset stage={visibleDrawerStage} />
        <MapTrackpadZoom />
        {showPinnedMedia && cards.length > 0 ? (
          <MapProjectionTracker onProjectorChange={handleProjectorChange} />
        ) : null}
        <DistanceMeasureTool />
        <ZoomControl position={MAP_DISPLAY_CONFIG.mapControls.zoomControlPosition} />
        <TileLayer
          attribution={MAP_DISPLAY_CONFIG.tileLayer.attribution}
          url={MAP_DISPLAY_CONFIG.tileLayer.url}
          eventHandlers={onInitialTilesReady ? { load: onInitialTilesReady } : undefined}
        />
        <PlaceLayer
          isAudioAutoplayEnabled={isAudioAutoplayEnabled}
          isTourActive={isTourActive}
          tourCloseMediaToken={tourCloseMediaToken}
          tourCloseOverlayToken={tourCloseOverlayToken}
          onTourEvent={onTourEvent}
          mapSettings={mapFallback}
          markerMode={markerMode}
          places={markerPlaces}
          placeCustomFieldDefinitions={placeCustomFieldDefinitions}
          onPinMedia={handlePinMedia}
          pinnedPreview={pinnedPreview}
          recommendedPlaceRequest={recommendedPlaceRequest}
        />
      </MapContainer>
      <MapAttribution
        hasPinnedDrawer={showPinnedMedia}
        isPinnedDrawerOpen={visibleDrawerStage !== "collapsed"}
        isDiscoveryOpen={visibleDrawerStage === "discovery"}
      />
      {showPinnedMedia ? (
        <PinnedMediaBoard
          cards={cards}
          recommendedItems={recommendedItems}
          onSelectRecommendedPlace={(placeId) =>
            setRecommendedPlaceRequest((current) => ({ placeId, serial: (current?.serial ?? 0) + 1 }))
          }
          notice={notice}
          onBringToFront={onBringToFront}
          onDock={onDock}
          onUndock={onUndock}
          drawerStage={pinnedDrawerStage}
          onDrawerStageChange={setPinnedDrawerStage}
          onLayoutChange={onLayoutChange}
          onMediaSizeChange={onMediaSizeChange}
          onRemove={onRemove}
          onPreview={(card) =>
            setPinnedPreview({
              card,
              target: { id: card.item.id, kind: card.item.kind, placeId: card.place.id, itemSnapshot: card.item },
            })
          }
          projectPlacePoint={projectPlacePoint}
        />
      ) : null}
    </>
  );
}
