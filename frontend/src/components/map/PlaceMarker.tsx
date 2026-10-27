import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Marker, useMap } from "react-leaflet";

import { mediaUrl } from "../../api/http";
import type { AppConfigMapMarkerScale, PlaceMapItem } from "../../api/types";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";
import { isMapAudioTarget, type MapAudioTarget } from "./mapAudioPlayback";
import { audioWaveformHtml, escapeAttribute } from "./mapHtml";
import { isMapKeyboardActivationKey } from "./mapKeyboardActivation";
import { placeMarkerOffsetStyle, type MarkerDisplayOffset } from "./mapMarkerDisplayOffset";
import { getPlaceMarkerLayout, type PlaceMarkerLayout } from "./mapMarkerScale";
import {
  galleryMotionStyle,
  getPlaceGalleryMotionLayout,
  isGalleryMotionItemInsideViewport,
  type GalleryMotionItem,
} from "./mapMotion";
import { placeMarkerEnterStyle } from "./placeMarkerMotion";
import { MAP_MARKER_PANE, PHOTO_GALLERY_PANE } from "./mapPanes";
import { getPlaceGalleryMaxSize } from "./placeGallerySizing";
import { getPlacePreviewVisual, type PlaceMapVisualItem } from "./placePreview";

const PLACE_GALLERY_DISPLAY_CONFIG = MAP_DISPLAY_CONFIG.placeGallery.display;

function markerIcon(
  previewItem: PlaceMapVisualItem,
  isSelected: boolean,
  layout: PlaceMarkerLayout,
  enterIndex: number,
  isEntering: boolean,
  displayOffset: MarkerDisplayOffset | null | undefined,
  isAudioPlaying: boolean,
) {
  const markerEnterStyle = placeMarkerEnterStyle(enterIndex);
  const enterClassName = isEntering ? "is-entering" : null;
  const imageUrl = escapeAttribute(mediaUrl(previewItem.thumb_path));
  const markerOffsetStyle = placeMarkerOffsetStyle(displayOffset);
  return L.divIcon({
    className: [
      "place-photo-marker",
      enterClassName,
      previewItem.kind === "memory" ? "is-memory" : "is-photo",
      isSelected ? "is-selected" : null,
    ]
      .filter(Boolean)
      .join(" "),
    html: `<span style="--place-marker-width: ${layout.width}px; --place-marker-height: ${layout.height}px; --place-marker-image: url('${imageUrl}'); ${markerOffsetStyle} ${markerEnterStyle}">${audioWaveformHtml(Boolean(previewItem.audio), isAudioPlaying)}</span>`,
    iconAnchor: [Math.round(layout.width / 2), Math.round(layout.height / 2)],
    iconSize: [layout.width, layout.height],
  });
}

function galleryVisualIcon(item: PlaceMapVisualItem, motion: GalleryMotionItem, isAudioPlaying: boolean) {
  const imageUrl = escapeAttribute(mediaUrl(item.thumb_path));
  return L.divIcon({
    className: ["photo-gallery-marker", item.kind === "memory" ? "is-memory" : "is-photo"].filter(Boolean).join(" "),
    html: `<span style="--photo-gallery-image: url('${imageUrl}'); ${galleryMotionStyle(motion)}">${audioWaveformHtml(Boolean(item.audio), isAudioPlaying)}</span>`,
    iconAnchor: [0, 0],
    iconSize: [1, 1],
  });
}

function galleryAddIcon(motion: GalleryMotionItem) {
  return L.divIcon({
    className: "photo-gallery-add-marker",
    html: `<span style="${galleryMotionStyle(motion)}">+</span>`,
    iconAnchor: [0, 0],
    iconSize: [1, 1],
  });
}

function stopMarkerClick(event: L.LeafletMouseEvent) {
  L.DomEvent.stop(event.originalEvent);
}

function activateMarkerFromKeyboard(event: L.LeafletKeyboardEvent, onActivate: () => void) {
  if (!isMapKeyboardActivationKey(event.originalEvent.key)) {
    return;
  }

  L.DomEvent.stop(event.originalEvent);
  onActivate();
}

type Props = {
  activeAudioTarget: MapAudioTarget | null;
  displayOffset?: MarkerDisplayOffset;
  place: PlaceMapItem;
  galleryItems: PlaceMapVisualItem[];
  isExpanded: boolean;
  isEntering: boolean;
  markerScale: AppConfigMapMarkerScale;
  onMediaOpen: (place: PlaceMapItem, item: PlaceMapVisualItem) => void;
  onMemoryOpen: (place: PlaceMapItem) => void;
  onPrefetchGallery: () => void;
  onToggleGallery: () => void;
  enterIndex: number;
  zoom: number;
};

export function PlaceMarker({
  activeAudioTarget,
  displayOffset,
  place,
  galleryItems,
  isExpanded,
  isEntering,
  markerScale,
  onMediaOpen,
  onMemoryOpen,
  onPrefetchGallery,
  onToggleGallery,
  enterIndex,
  zoom,
}: Props) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const galleryItemCount = galleryItems.length + 1;
  const previewItem = useMemo(() => getPlacePreviewVisual(place), [place]);
  const placeLayout = useMemo(
    () => getPlaceMarkerLayout({ editorialPriority: place.weight, markerScale, zoom }),
    [markerScale, place.weight, zoom],
  );
  const markerVisualOffset = isExpanded ? null : displayOffset;
  const isPreviewAudioPlaying = previewItem ? isMapAudioTarget(activeAudioTarget, place.id, previewItem) : false;
  const placeIcon = useMemo(
    () =>
      previewItem
        ? markerIcon(
            previewItem,
            isExpanded,
            placeLayout,
            enterIndex,
            isEntering,
            markerVisualOffset,
            isPreviewAudioPlaying,
          )
        : null,
    [enterIndex, isEntering, isExpanded, isPreviewAudioPlaying, markerVisualOffset, placeLayout, previewItem],
  );
  useEffect(() => {
    if (isExpanded) {
      return;
    }

    const marker = markerRef.current;
    const element = marker?.getElement();
    if (!marker || !element) {
      return;
    }

    const handlePrefetch = () => onPrefetchGallery();
    const handleFocus = () => onPrefetchGallery();

    element.addEventListener("pointerenter", handlePrefetch, { passive: true });
    element.addEventListener("pointerdown", handlePrefetch, { passive: true });
    element.addEventListener("focus", handleFocus);

    return () => {
      element.removeEventListener("pointerenter", handlePrefetch);
      element.removeEventListener("pointerdown", handlePrefetch);
      element.removeEventListener("focus", handleFocus);
    };
  }, [isExpanded, onPrefetchGallery, placeIcon]);

  const mapSize = map.getSize();
  const markerPoint = map.latLngToContainerPoint([place.lat, place.lon]);
  const placePosition = L.latLng(place.lat, place.lon);
  const availableGalleryWidth = Math.max(
    0,
    Math.min(markerPoint.x, mapSize.x - markerPoint.x) * 2 - PLACE_GALLERY_DISPLAY_CONFIG.edgePadding,
  );
  const availableGalleryHeight = Math.max(
    0,
    Math.min(markerPoint.y, mapSize.y - markerPoint.y) * 2 - PLACE_GALLERY_DISPLAY_CONFIG.edgePadding,
  );
  const galleryMaxSize = getPlaceGalleryMaxSize({
    availableHeight: availableGalleryHeight,
    availableWidth: availableGalleryWidth,
    itemCount: galleryItemCount,
    viewportHeight: mapSize.y,
    viewportWidth: mapSize.x,
  });

  const galleryLayout = useMemo(() => {
    return getPlaceGalleryMotionLayout(galleryItemCount, {
      maxHeight: galleryMaxSize.maxHeight,
      maxWidth: galleryMaxSize.maxWidth,
    }).map((motion) => ({
      isInsideViewport: isGalleryMotionItemInsideViewport(motion, {
        anchorX: markerPoint.x,
        anchorY: markerPoint.y,
        padding: 0,
        viewportHeight: mapSize.y,
        viewportWidth: mapSize.x,
      }),
      motion,
      position: L.latLng(place.lat, place.lon),
    }));
  }, [
    galleryItemCount,
    galleryMaxSize.maxHeight,
    galleryMaxSize.maxWidth,
    mapSize.x,
    mapSize.y,
    markerPoint.x,
    markerPoint.y,
    place.lat,
    place.lon,
  ]);
  const galleryVisualIcons = useMemo(
    () =>
      galleryItems.map((item, index) =>
        galleryLayout[index]
          ? galleryVisualIcon(item, galleryLayout[index].motion, isMapAudioTarget(activeAudioTarget, place.id, item))
          : null,
      ),
    [activeAudioTarget, galleryItems, galleryLayout, place.id],
  );
  const galleryAddLayout = galleryLayout[galleryItems.length] ?? null;
  const galleryAddMarkerIcon = useMemo(
    () => (galleryAddLayout ? galleryAddIcon(galleryAddLayout.motion) : null),
    [galleryAddLayout],
  );

  if (!previewItem || !placeIcon) {
    return null;
  }

  return (
    <>
      <Marker
        alt={`Pokaż media miejsca ${place.title}`}
        icon={placeIcon}
        ref={markerRef}
        key={isExpanded ? PHOTO_GALLERY_PANE : MAP_MARKER_PANE}
        keyboard
        pane={isExpanded ? PHOTO_GALLERY_PANE : MAP_MARKER_PANE}
        position={placePosition}
        riseOnHover
        title={place.title}
        zIndexOffset={isExpanded ? 1280 : placeLayout.zIndexOffset}
        eventHandlers={{
          click: (event) => {
            stopMarkerClick(event);
            onToggleGallery();
          },
          keydown: (event) => activateMarkerFromKeyboard(event, onToggleGallery),
        }}
      />

      {isExpanded
        ? galleryItems.map((item, index) => {
            const layout = galleryLayout[index];
            const icon = galleryVisualIcons[index];
            if (!layout?.isInsideViewport || !icon) {
              return null;
            }

            return (
              <Marker
                alt={`Otwórz medium miejsca ${place.title}`}
                icon={icon}
                key={`${item.kind}:${item.id}`}
                keyboard
                pane={PHOTO_GALLERY_PANE}
                position={layout.position}
                riseOnHover
                title={item.caption ?? place.title}
                zIndexOffset={1300 + index}
                eventHandlers={{
                  click: (event) => {
                    stopMarkerClick(event);
                    onMediaOpen(place, item);
                  },
                  keydown: (event) => activateMarkerFromKeyboard(event, () => onMediaOpen(place, item)),
                }}
              />
            );
          })
        : null}

      {isExpanded && galleryAddLayout?.isInsideViewport && galleryAddMarkerIcon ? (
        <Marker
          alt={`Dodaj pamiątkę do miejsca ${place.title}`}
          icon={galleryAddMarkerIcon}
          keyboard
          pane={PHOTO_GALLERY_PANE}
          position={galleryAddLayout.position}
          riseOnHover
          title={`Byłem tutaj: ${place.title}`}
          zIndexOffset={1400 + galleryItems.length}
          eventHandlers={{
            click: (event) => {
              stopMarkerClick(event);
              onMemoryOpen(place);
            },
            keydown: (event) => activateMarkerFromKeyboard(event, () => onMemoryOpen(place)),
          }}
        />
      ) : null}
    </>
  );
}
