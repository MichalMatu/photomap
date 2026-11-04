import { type ReactNode, useEffect, useRef, useState } from "react";

import { lockDocumentScroll, unlockDocumentScroll } from "../ui/documentScrollLock";
import { AppShellDrawer } from "./AppShellDrawer";
import { AppShellMenuButton } from "./AppShellMenuButton";
import { AppShellRail } from "./AppShellRail";
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
  mapAudioControl?: AppShellMapAudioControl;
  mapLayerControls?: AppShellMapLayerControls;
  mapMarkerModeControl?: AppShellMapMarkerModeControl;
  mapPinnedMediaControl?: AppShellMapPinnedMediaControl;
  mapCategoryControls?: AppShellMapCategoryControls;
};

function menuButtonLabel(navigationState: AppShellNavigationState) {
  if (navigationState === "collapsed") return "Pokaż pasek nawigacji";
  if (navigationState === "rail") return "Otwórz menu";
  return "Zamknij menu";
}

export function AppShell({
  activeSection,
  adminAction,
  children,
  onStartTour,
  tourShowDrawer = false,
  mapAudioControl,
  mapCategoryControls,
  mapLayerControls,
  mapMarkerModeControl,
  mapPinnedMediaControl,
}: Props) {
  const [navigationState, setNavigationState] = useState<AppShellNavigationState>("collapsed");
  const wasTourDrawerOpen = useRef(false);

  useEffect(() => {
    if (tourShowDrawer) {
      setNavigationState("drawer");
    } else if (wasTourDrawerOpen.current) {
      setNavigationState("collapsed");
    }
    wasTourDrawerOpen.current = tourShowDrawer;
  }, [tourShowDrawer]);
  const isRailOpen = navigationState === "rail";
  const isMenuOpen = navigationState === "drawer";
  const isNavigationOpen = navigationState !== "collapsed";
  const railItems = primaryItems.filter((item) => item.section !== activeSection);
  const closeNavigation = () => setNavigationState("collapsed");
  const showDrawer = () => setNavigationState("drawer");
  const handleMenuCycle = () => setNavigationState((currentState) => getNextAppShellNavigationState(currentState));
  const handleAdminAction = () => {
    closeNavigation();
    adminAction?.onClick();
  };

  useEffect(() => {
    if (!isNavigationOpen) {
      return;
    }

    lockDocumentScroll();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNavigation();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockDocumentScroll();
    };
  }, [isNavigationOpen]);

  useEffect(() => {
    if (tourShowDrawer) return;
    let start: { id: number; x: number; y: number; surface: AppShellSwipeSurface } | null = null;
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      const target = event.target instanceof Element ? event.target : null;
      let surface: AppShellSwipeSurface = "outside";
      if (target?.closest(".side-drawer")) surface = "drawer";
      else if (target?.closest(".side-rail")) surface = "rail";
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
      if (next !== navigationState) setNavigationState(next);
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
  }, [navigationState, tourShowDrawer]);

  return (
    <div className={`app-shell app-shell--${activeSection} app-shell--${navigationState}`}>
      <AppShellMenuButton
        label={menuButtonLabel(navigationState)}
        navigationState={navigationState}
        onClick={handleMenuCycle}
      />

      <AppShellRail
        activeSection={activeSection}
        adminAction={adminAction}
        isOpen={isRailOpen}
        mapLayerControls={mapLayerControls}
        mapPinnedMediaControl={mapPinnedMediaControl}
        railItems={railItems}
        onAdminAction={handleAdminAction}
        onOpenDrawer={showDrawer}
      />

      {isNavigationOpen ? (
        <button className="drawer-scrim" type="button" aria-label="Zamknij menu" onClick={closeNavigation} />
      ) : null}

      <AppShellDrawer
        activeSection={activeSection}
        adminAction={adminAction}
        isOpen={isMenuOpen}
        mapAudioControl={mapAudioControl}
        mapCategoryControls={mapCategoryControls}
        mapLayerControls={mapLayerControls}
        mapMarkerModeControl={mapMarkerModeControl}
        mapPinnedMediaControl={mapPinnedMediaControl}
        primaryItems={primaryItems}
        onStartTour={
          onStartTour
            ? () => {
                closeNavigation();
                onStartTour();
              }
            : undefined
        }
        onAdminAction={handleAdminAction}
        onClose={() => {
          if (!tourShowDrawer) closeNavigation();
        }}
      />

      <div className="app-content">{children}</div>
    </div>
  );
}
