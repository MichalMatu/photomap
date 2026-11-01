import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getAppConfig } from "../api/appConfig";
import { getMapPlaces } from "../api/places";
import { AppShell } from "../components/layout/AppShell";
import { ModeratorRecruitmentPrompt } from "../components/layout/ModeratorRecruitmentPrompt";
import {
  filterMapPlacesByCategories,
  getMapCategoryFilterItems,
  toggleMapCategoryFilter,
} from "../components/map/mapCategoryFilters";
import {
  countMapLayerPlaces,
  DEFAULT_MAP_LAYER_STATE,
  filterMapPlaces,
  hasAnyMapLayerActive,
  isAllMapLayerPresetActive,
  isMapLayerControlActive,
  MAP_LAYER_CONTROLS,
  type MapLayerControlId,
  toggleMapLayer,
} from "../components/map/mapLayers";
import { MAP_DISPLAY_CONFIG } from "../components/map/mapDisplayConfig";
import { getPlacePreviewVisual } from "../components/map/placePreview";
import { PlaceMap } from "../components/map/PlaceMap";
import { readMapMarkerMode, writeMapMarkerMode, type MapMarkerMode } from "../components/map/mapMarkerMode";
import { SEOHead } from "../components/ui/SEOHead";
import { MapTour } from "../components/tour/MapTour";
import {
  isTourComplete, nextStepOnEvent, nextTourStepForPhoto, previousTourStepForPhoto, skipUnavailableTourStep,
  rememberTourComplete, type MapTourEvent, type MapTourStep,
} from "../components/tour/mapTourSteps";
import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SEO_TITLE } from "../seo/pageSeo";

export function PublicMapPage() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isAudioAutoplayEnabled, setIsAudioAutoplayEnabled] = useState(false);
  const [isPinnedMediaVisible, setIsPinnedMediaVisible] = useState(true);
  const [markerMode, setMarkerMode] = useState<MapMarkerMode>(readMapMarkerMode);
  useEffect(() => writeMapMarkerMode(markerMode), [markerMode]);
  const [mapLayerState, setMapLayerState] = useState(DEFAULT_MAP_LAYER_STATE);
  const [tourStep, setTourStep] = useState<MapTourStep | null>(null);
  const [hasSeenTour, setHasSeenTour] = useState(isTourComplete);
  const [closeTourMediaToken, setCloseTourMediaToken] = useState(0);
  const [closeTourOverlayToken, setCloseTourOverlayToken] = useState(0);
  const tourInitialLayers = useRef(DEFAULT_MAP_LAYER_STATE);

  const startTour = useCallback(() => {
    if (tourStep !== null) return;
    tourInitialLayers.current = mapLayerState;
    setTourStep("welcome");
  }, [mapLayerState, tourStep]);

  const endTour = useCallback(() => {
    setTourStep(null);
    setCloseTourMediaToken((current) => current + 1);
    setMapLayerState(tourInitialLayers.current);
    setHasSeenTour(true);
    rememberTourComplete();
  }, []);

  const advanceTour = useCallback(() => {
    if (tourStep === null) return;
    if (tourStep === "done") {
      endTour();
      return;
    }
    if (tourStep === "pinned" || tourStep === "memory-form") {
      setCloseTourOverlayToken((current) => current + 1);
    }
    setTourStep(nextTourStepForPhoto(tourStep, Boolean(document.querySelector(".system-modal--media .photo-detail-audio-toggle"))));
  }, [endTour, tourStep]);

  const skipUnavailableStep = useCallback(() => {
    if (tourStep === null) return;
    if (tourStep === "pin") setCloseTourOverlayToken((current) => current + 1);
    if (tourStep === "place" || tourStep === "gallery" || tourStep === "memory") {
      setCloseTourMediaToken((current) => current + 1);
    }
    setTourStep(skipUnavailableTourStep(tourStep));
  }, [tourStep]);

  const handleTourEvent = useCallback((event: MapTourEvent) => {
    setTourStep((current) => (current ? (nextStepOnEvent(current, event) ?? current) : null));
  }, []);

  const appConfigQuery = useQuery({
    queryKey: ["app-config"],
    queryFn: getAppConfig,
    staleTime: 300_000,
  });
  const placesQuery = useQuery({
    queryKey: ["places-map", "all"],
    queryFn: () => getMapPlaces(),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (hasSeenTour || tourStep !== null || appConfigQuery.isLoading || placesQuery.isLoading || placesQuery.isError) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (document.querySelector(".system-modal-backdrop")) return;
      startTour();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [appConfigQuery.isLoading, hasSeenTour, placesQuery.isError, placesQuery.isLoading, startTour, tourStep]);

  const mapPlaces = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const layerPlaces = useMemo(() => filterMapPlaces(mapPlaces, mapLayerState), [mapLayerState, mapPlaces]);
  const visiblePlaces = useMemo(
    () => filterMapPlacesByCategories(layerPlaces, selectedCategoryIds),
    [layerPlaces, selectedCategoryIds],
  );
  const markerPlaces = useMemo(
    () => visiblePlaces.filter((place) => getPlacePreviewVisual(place) !== null),
    [visiblePlaces],
  );
  const categoryFilterItems = useMemo(() => getMapCategoryFilterItems(mapPlaces), [mapPlaces]);
  const layerCounts = useMemo(() => countMapLayerPlaces(mapPlaces), [mapPlaces]);
  const isAllLayerActive = isAllMapLayerPresetActive(mapLayerState);
  const hasAnyLayerActive = hasAnyMapLayerActive(mapLayerState);
  const mapFallback = appConfigQuery.data?.map ?? MAP_DISPLAY_CONFIG.fallback.emptyCountryMap;
  const placeCustomFieldDefinitions = appConfigQuery.data?.place_custom_fields ?? [];
  const isMapLoading = placesQuery.isLoading || appConfigQuery.isLoading;
  const isMapError = placesQuery.isError;
  const hasActiveFilters =
    selectedCategoryIds.length > 0 ||
    (!isAllLayerActive && hasAnyLayerActive) ||
    mapPlaces.length !== visiblePlaces.length;
  const hasPlacesWithoutMapMedia = visiblePlaces.length > 0 && markerPlaces.length === 0;
  const showEmptyMapState = !isMapLoading && !isMapError && hasAnyLayerActive && markerPlaces.length === 0;

  return (
    <>
      <SEOHead title={DEFAULT_SEO_TITLE} description={DEFAULT_SEO_DESCRIPTION} url="/" />
      <AppShell
        activeSection="map"
        onStartTour={startTour}
        tourShowDrawer={tourStep === "layers" || tourStep === "routes"}
        mapAudioControl={{
          active: isAudioAutoplayEnabled,
          label: "Audio",
          onToggle: () => setIsAudioAutoplayEnabled((currentValue) => !currentValue),
        }}
        mapCategoryControls={{
          items: categoryFilterItems.map((category) => ({
            ...category,
            active: selectedCategoryIds.includes(category.id),
          })),
          onClear: () => setSelectedCategoryIds([]),
          onToggle: (categoryId) =>
            setSelectedCategoryIds((currentCategoryIds) => toggleMapCategoryFilter(currentCategoryIds, categoryId)),
          selectedCount: selectedCategoryIds.length,
        }}
        mapLayerControls={{
          items: MAP_LAYER_CONTROLS.map((layer) => ({
            ...layer,
            active: isMapLayerControlActive(mapLayerState, layer.id),
            count: layerCounts[layer.id],
          })),
          onToggle: (layerId) => {
            setMapLayerState((currentState) => toggleMapLayer(currentState, layerId as MapLayerControlId));
            handleTourEvent("layer-toggled");
          },
        }}
        mapPinnedMediaControl={{
          active: isPinnedMediaVisible,
          label: "Przypięte",
          onToggle: () => setIsPinnedMediaVisible((currentValue) => !currentValue),
        }}
      >
        <main className="page-shell map-page">
          {isMapLoading || isMapError ? (
            <div
              className={isMapError ? "ui-panel map-status-panel map-status-panel--error" : "ui-panel map-status-panel"}
              role="status"
            >
              {isMapLoading ? <p>Ładowanie mapy...</p> : null}
              {isMapError ? <p className="error-text">Nie udało się pobrać mapy</p> : null}
            </div>
          ) : null}
          {showEmptyMapState ? (
            <div className="ui-panel map-empty-panel" role="status">
              <p>
                {hasActiveFilters
                  ? "Brak miejsc dla tych filtrów."
                  : hasPlacesWithoutMapMedia
                    ? "Brak mediów do pokazania na mapie."
                    : "Brak miejsc do pokazania na mapie."}
              </p>
              {hasActiveFilters ? (
                <button
                  className="ui-button ui-button--secondary"
                  type="button"
                  onClick={() => {
                    setSelectedCategoryIds([]);
                    setMapLayerState(DEFAULT_MAP_LAYER_STATE);
                  }}
                >
                  Wyczyść filtry
                </button>
              ) : null}
            </div>
          ) : null}
          <ModeratorRecruitmentPrompt />
          {!isMapLoading && !isMapError ? (
            <div className="map-frame">
              <PlaceMap
                isAudioAutoplayEnabled={isAudioAutoplayEnabled}
                isTourActive={tourStep !== null}
                tourCloseMediaToken={closeTourMediaToken}
                tourCloseOverlayToken={closeTourOverlayToken}
                onTourEvent={handleTourEvent}
                mapFallback={mapFallback}
                markerPlaces={markerPlaces}
                markerMode={markerMode}
                onMarkerModeChange={setMarkerMode}
                onPinnedMediaVisibleChange={setIsPinnedMediaVisible}
                pinnedMediaPlaces={mapPlaces}
                placeCustomFieldDefinitions={placeCustomFieldDefinitions}
                showPinnedMedia={isPinnedMediaVisible}
              />
            </div>
          ) : null}
        </main>
      </AppShell>
      {tourStep !== null ? (
        <MapTour
          step={tourStep}
          onBack={() => {
            if (tourStep === "memory-form") setCloseTourOverlayToken((current) => current + 1);
            setTourStep(previousTourStepForPhoto(tourStep, Boolean(document.querySelector(".system-modal--media .photo-detail-audio-toggle"))));
          }}
          onNext={advanceTour}
          onSkipStep={skipUnavailableStep}
          onClose={endTour}
        />
      ) : null}
    </>
  );
}
