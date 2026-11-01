import type { Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import type { AppConfigMap, PlaceCustomFieldDefinition, PlaceMapItem } from "../../api/types";
import { SystemModal } from "../ui/SystemModal";
import { MemorySheet } from "./MemorySheet";
import { MapCloseEvents } from "./MapCloseEvents";
import { MapInteractionLock } from "./mapInteractionLock";
import { isSameMapAudioTarget, type MapAudioTarget } from "./mapAudioPlayback";
import { MapPhotoGalleryGlass } from "./MapPhotoGalleryGlass";
import { MapPhotoGalleryPane } from "./MapPhotoGalleryPane";
import { PhotoDetailModal } from "./photo-detail/PhotoDetailModal";
import { PlaceMarker } from "./PlaceMarker";
import type { MapMarkerMode } from "./mapMarkerMode";
import { getPlaceMarkerMotionSignature, getPlaceMarkerMotionState, isPlaceMarkerEntering } from "./placeMarkerMotion";
import type { PlaceMapVisualItem } from "./placePreview";
import { ReportSheet } from "./ReportSheet";
import { useCenteredPlaceGallery } from "./useCenteredPlaceGallery";
import { usePlaceGalleryPreloadControls, useVisiblePlaceGalleriesPreload } from "./placeGalleryPreload";
import { type MapViewport, useMapMarkerLayout } from "./useMapMarkerLayout";
import { type PlaceVisualTarget, usePlaceGalleryData } from "./usePlaceGalleryData";
import type { PinMediaRequest } from "./pinned-media/usePinnedMediaBoard";
import type { MapTourEvent } from "../tour/mapTourSteps";

type PlaceLayerProps = {
  isAudioAutoplayEnabled: boolean;
  isTourActive?: boolean;
  tourCloseMediaToken?: number;
  tourCloseOverlayToken?: number;
  onTourEvent?: (event: MapTourEvent) => void;
  mapSettings: AppConfigMap;
  markerMode: MapMarkerMode;
  onPinMedia: (request: PinMediaRequest) => boolean;
  places: PlaceMapItem[];
  placeCustomFieldDefinitions: PlaceCustomFieldDefinition[];
};

const EMPTY_PLACE_GALLERY_ITEMS: PlaceMapVisualItem[] = [];

function readMapViewport(map: LeafletMap): MapViewport {
  const size = map.getSize();
  const center = map.getCenter();

  return {
    centerLat: center.lat,
    centerLon: center.lng,
    height: size.y,
    width: size.x,
    zoom: map.getZoom(),
  };
}

export function PlaceLayer({
  isAudioAutoplayEnabled,
  isTourActive = false,
  tourCloseMediaToken = 0,
  tourCloseOverlayToken = 0,
  onTourEvent,
  mapSettings,
  markerMode,
  onPinMedia,
  places,
  placeCustomFieldDefinitions,
}: PlaceLayerProps) {
  const map = useMap();
  const [mapViewport, setMapViewport] = useState(() => readMapViewport(map));
  const refreshMapViewport = useCallback(() => {
    setMapViewport(readMapViewport(map));
  }, [map]);
  const placeMarkerMotion = useMemo(() => getPlaceMarkerMotionState(places), [places]);
  const previousPlaceMotionSignatures = useRef<Map<string, string> | null>(null);
  const [memoryPlace, setMemoryPlace] = useState<PlaceMapItem | null>(null);
  const [activeAudioTarget, setActiveAudioTarget] = useState<MapAudioTarget | null>(null);
  const [visualDetail, setVisualDetail] = useState<PlaceVisualTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<PlaceVisualTarget | null>(null);
  const [isThanksOpen, setIsThanksOpen] = useState(false);
  const lastTourCloseToken = useRef(tourCloseMediaToken);
  const lastTourOverlayToken = useRef(tourCloseOverlayToken);
  const zoom = mapViewport.zoom;
  const { prefetchPlaceGallery, prioritizeMediaItem, prioritizePlaceGallery } = usePlaceGalleryPreloadControls();
  const { markerDisplayOffsets, markerPlaces } = useMapMarkerLayout({
    map,
    mapSettings,
    mapViewport,
    places,
  });
  useVisiblePlaceGalleriesPreload(markerPlaces);
  const { closePlaceGallery, expandedPlace, expandedPlaceId, isGalleryInteractionLocked, togglePlaceGallery } =
    useCenteredPlaceGallery(map, places);
  const {
    detailItem,
    detailNavigationItems,
    detailPlace,
    galleryItemsByPlaceId,
    renderedMarkerPlaces,
    reportItem,
    reportPlace,
  } = usePlaceGalleryData({
    expandedPlace,
    expandedPlaceId,
    markerPlaces,
    places,
    reportTarget,
    visualDetail,
  });

  useEffect(() => {
    if (tourCloseMediaToken === lastTourCloseToken.current) return;
    lastTourCloseToken.current = tourCloseMediaToken;
    closePlaceGallery();
    setVisualDetail(null);
    setMemoryPlace(null);
    setReportTarget(null);
    setActiveAudioTarget(null);
  }, [closePlaceGallery, tourCloseMediaToken]);

  useEffect(() => {
    if (tourCloseOverlayToken === lastTourOverlayToken.current) return;
    lastTourOverlayToken.current = tourCloseOverlayToken;
    setVisualDetail(null);
    setMemoryPlace(null);
    setReportTarget(null);
    setActiveAudioTarget(null);
  }, [tourCloseOverlayToken]);

  useMapEvents({
    moveend: refreshMapViewport,
    resize: refreshMapViewport,
    zoomend: refreshMapViewport,
  });

  useEffect(() => {
    refreshMapViewport();
  }, [placeMarkerMotion.placesMotionSignature, refreshMapViewport]);

  useEffect(() => {
    previousPlaceMotionSignatures.current = placeMarkerMotion.signaturesByPlaceId;
  }, [placeMarkerMotion.signaturesByPlaceId]);

  useEffect(() => {
    if (memoryPlace && !places.some((place) => place.id === memoryPlace.id)) {
      setMemoryPlace(null);
    }
    if (visualDetail && !places.some((place) => place.id === visualDetail.placeId)) {
      setVisualDetail(null);
      setActiveAudioTarget(null);
    }
    if (reportTarget && !places.some((place) => place.id === reportTarget.placeId)) {
      setReportTarget(null);
    }
  }, [memoryPlace, places, reportTarget, visualDetail]);

  return (
    <>
      <MapCloseEvents
        onClose={() => {
          closePlaceGallery();
          setMemoryPlace(null);
        }}
      />
      <MapInteractionLock isLocked={isGalleryInteractionLocked} />
      <MapPhotoGalleryPane />
      <MapPhotoGalleryGlass place={expandedPlace} onClose={closePlaceGallery} />
      {renderedMarkerPlaces.map((place, index) => {
        const placeMotionSignature =
          placeMarkerMotion.signaturesByPlaceId.get(place.id) ?? getPlaceMarkerMotionSignature(place);

        return (
          <PlaceMarker
            key={`${placeMotionSignature}:${place.id}`}
            activeAudioTarget={activeAudioTarget}
            place={place}
            galleryItems={galleryItemsByPlaceId.get(place.id) ?? EMPTY_PLACE_GALLERY_ITEMS}
            isExpanded={expandedPlaceId === place.id}
            isTourActive={isTourActive}
            enterIndex={index}
            isEntering={isPlaceMarkerEntering(previousPlaceMotionSignatures.current, place.id, placeMotionSignature)}
            onMemoryOpen={(nextPlace) => {
              setMemoryPlace(nextPlace);
              onTourEvent?.("memory-opened");
            }}
            onPrefetchGallery={() => prefetchPlaceGallery(place)}
            onMediaOpen={(nextPlace, nextItem) => {
              prioritizeMediaItem(nextItem);
              setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: nextPlace.id });
              onTourEvent?.("photo-opened");
            }}
            onToggleGallery={() => {
              if (expandedPlaceId !== place.id) {
                prioritizePlaceGallery(place);
              }
              togglePlaceGallery(place);
              if (expandedPlaceId !== place.id) onTourEvent?.("gallery-opened");
            }}
            displayOffset={markerDisplayOffsets.get(place.id)}
            markerScale={mapSettings.marker_scale}
            markerMode={markerMode}
            zoom={zoom}
          />
        );
      })}
      <MemorySheet
        place={memoryPlace}
        onClose={() => setMemoryPlace(null)}
        onUploaded={() => {
          setMemoryPlace(null);
          setIsThanksOpen(true);
        }}
      />
      {detailItem && detailPlace ? (
        <PhotoDetailModal
          customFieldDefinitions={placeCustomFieldDefinitions}
          isAudioAutoplayEnabled={isAudioAutoplayEnabled}
          item={detailItem}
          navigationItems={detailNavigationItems}
          place={detailPlace}
          onAudioPlaybackChange={(isPlaying) => {
            const nextTarget: MapAudioTarget = {
              id: detailItem.id,
              kind: detailItem.kind,
              placeId: detailPlace.id,
            };
            setActiveAudioTarget((currentTarget) => {
              if (isPlaying) {
                return nextTarget;
              }
              return isSameMapAudioTarget(currentTarget, nextTarget) ? null : currentTarget;
            });
          }}
          onPin={(pinRequest) => {
            const didPin = onPinMedia({ item: detailItem, place: detailPlace, ...pinRequest });
            if (didPin) {
              setVisualDetail(null);
              onTourEvent?.("pin-created");
            }

            return didPin;
          }}
          onNavigate={(nextItem) => {
            prioritizeMediaItem(nextItem);
            setActiveAudioTarget(null);
            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: detailPlace.id });
          }}
          onReport={() => setReportTarget({ id: detailItem.id, kind: detailItem.kind, placeId: detailPlace.id })}
          onClose={() => {
            setActiveAudioTarget(null);
            setVisualDetail(null);
          }}
        />
      ) : null}
      <ReportSheet
        target={reportItem && reportPlace ? { item: reportItem, place: reportPlace } : null}
        onClose={() => setReportTarget(null)}
      />
      {isThanksOpen ? (
        <SystemModal
          eyebrow="Dziękujemy"
          title="Pamiątka trafiła do moderacji"
          message="Pamiątka została dodana i pojawi się publicznie po zatwierdzeniu przez redakcję."
          confirmLabel="OK"
          onClose={() => setIsThanksOpen(false)}
        />
      ) : null}
    </>
  );
}
