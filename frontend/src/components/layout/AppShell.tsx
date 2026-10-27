import { type ReactNode, useEffect, useRef, useState } from "react";

import { lockDocumentScroll, unlockDocumentScroll } from "../ui/documentScrollLock";
import { AppShellDrawer } from "./AppShellDrawer";
import { AppShellMenuButton } from "./AppShellMenuButton";
import { AppShellRail } from "./AppShellRail";
import { primaryItems } from "./appShellItems";
import { getNextAppShellNavigationState, type AppShellNavigationState } from "./appShellNavigation";
import type {
  AppSection,
  AppShellAdminAction,
  AppShellMapAudioControl,
  AppShellMapCategoryControls,
  AppShellMapLayerControls,
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
        mapAudioControl={mapAudioControl}
        mapCategoryControls={mapCategoryControls}
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
        mapPinnedMediaControl={mapPinnedMediaControl}
        primaryItems={primaryItems}
        onStartTour={onStartTour ? () => { closeNavigation(); onStartTour(); } : undefined}
        onAdminAction={handleAdminAction}
        onClose={closeNavigation}
      />

      <div className="app-content">{children}</div>
    </div>
  );
}
