import { type ReactNode, useEffect, useRef, useState } from "react";

import { lockDocumentScroll, unlockDocumentScroll } from "../ui/documentScrollLock";
import { AppShellDrawer } from "./AppShellDrawer";
import { AppShellMapTools, type MapToolsPanel } from "./AppShellMapTools";
import { AppShellMenuButton } from "./AppShellMenuButton";
import { primaryItems } from "./appShellItems";
import {
  getNextAppShellNavigationState,
  getSwipeAppShellNavigationState,
  type AppShellNavigationState,
  type AppShellSwipeSurface,
} from "./appShellNavigation";
import type {
  AppSection,
  AppShellAdminAction,
  AppShellMapAudioControl,
  AppShellMapCategoryControls,
  AppShellMapLayerControls,
  AppShellMapMarkerModeControl,
  AppShellMapPinnedMediaControl,
} from "./appShellTypes";

type Props = {
  activeSection: AppSection;
  adminAction?: AppShellAdminAction;
  children: ReactNode;
  onStartTour?: () => void;
  tourShowDrawer?: boolean;
  tourShowFilters?: boolean;
  mapAudioControl?: AppShellMapAudioControl;
  mapLayerControls?: AppShellMapLayerControls;
  mapMarkerModeControl?: AppShellMapMarkerModeControl;
  mapPinnedMediaControl?: AppShellMapPinnedMediaControl;
  mapCategoryControls?: AppShellMapCategoryControls;
};

export function AppShell({
  activeSection,
  adminAction,
  children,
  onStartTour,
  tourShowDrawer = false,
  tourShowFilters = false,
  mapAudioControl,
  mapCategoryControls,
  mapLayerControls,
  mapMarkerModeControl,
  mapPinnedMediaControl,
}: Props) {
  const [navigationState, setNavigationState] = useState<AppShellNavigationState>("collapsed");
  const [mapPanel, setMapPanel] = useState<MapToolsPanel | null>(null);
  const wasTourOverlayOpen = useRef(false);
  const isMenuOpen = navigationState === "drawer";
  const isOverlayOpen = isMenuOpen || mapPanel !== null;

  useEffect(() => {
    if (tourShowDrawer) {
      setMapPanel(null);
      setNavigationState("drawer");
    } else if (tourShowFilters) {
      setNavigationState("collapsed");
      setMapPanel("filters");
    } else if (wasTourOverlayOpen.current) {
      setNavigationState("collapsed");
      setMapPanel(null);
    }
    wasTourOverlayOpen.current = tourShowDrawer || tourShowFilters;
  }, [tourShowDrawer, tourShowFilters]);

  const closeOverlays = () => {
    setNavigationState("collapsed");
    setMapPanel(null);
  };
  const toggleNavigation = () => {
    setMapPanel(null);
    setNavigationState((current) => getNextAppShellNavigationState(current));
  };
  const toggleMapPanel = (next: MapToolsPanel) => {
    setNavigationState("collapsed");
    setMapPanel((current) => (current === next ? null : next));
  };
  const handleAdminAction = () => {
    closeOverlays();
    adminAction?.onClick();
  };

  useEffect(() => {
    if (!isOverlayOpen) return;
    lockDocumentScroll();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOverlays();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockDocumentScroll();
    };
  }, [isOverlayOpen]);

  useEffect(() => {
    if (tourShowDrawer || tourShowFilters) return;
    let start: { id: number; x: number; y: number; surface: AppShellSwipeSurface } | null = null;
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      const target = event.target instanceof Element ? event.target : null;
      let surface: AppShellSwipeSurface = "outside";
      if (target?.closest(".side-drawer")) surface = "drawer";
      else if (event.clientX >= 24 && event.clientX <= 76) surface = "edge";
      start = { id: event.pointerId, x: event.clientX, y: event.clientY, surface };
    };
    const up = (event: PointerEvent) => {
      if (!start || start.id !== event.pointerId) return;
      const gesture = start;
      start = null;
      const next = getSwipeAppShellNavigationState(
        navigationState,
        gesture.x,
        gesture.y,
        event.clientX,
        event.clientY,
        gesture.surface,
      );
      if (next !== navigationState) {
        setMapPanel(null);
        setNavigationState(next);
      }
    };
    const cancel = () => {
      start = null;
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancel, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
    };
  }, [navigationState, tourShowDrawer, tourShowFilters]);

  return (
    <div className={`app-shell app-shell--${activeSection} app-shell--${navigationState}`}>
      <AppShellMenuButton navigationState={navigationState} onClick={toggleNavigation} />

      {activeSection === "map" &&
      mapLayerControls &&
      mapCategoryControls &&
      mapMarkerModeControl &&
      mapPinnedMediaControl &&
      mapAudioControl &&
      !isMenuOpen ? (
        <AppShellMapTools
          panel={mapPanel}
          onPanelChange={toggleMapPanel}
          mapAudioControl={mapAudioControl}
          mapCategoryControls={mapCategoryControls}
          mapLayerControls={mapLayerControls}
          mapMarkerModeControl={mapMarkerModeControl}
          mapPinnedMediaControl={mapPinnedMediaControl}
        />
      ) : null}

      {isOverlayOpen ? (
        <button
          className={mapPanel ? "drawer-scrim drawer-scrim--map-tools" : "drawer-scrim"}
          type="button"
          aria-label="Zamknij panel"
          onClick={closeOverlays}
        />
      ) : null}

      <AppShellDrawer
        activeSection={activeSection}
        adminAction={adminAction}
        isOpen={isMenuOpen}
        primaryItems={primaryItems}
        onStartTour={
          onStartTour
            ? () => {
                closeOverlays();
                onStartTour();
              }
            : undefined
        }
        onAdminAction={handleAdminAction}
        onClose={() => {
          if (!tourShowDrawer) closeOverlays();
        }}
      />
      <div className="app-content">{children}</div>
    </div>
  );
}
