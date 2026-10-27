import { APP_NAME } from "../../config/app";
import { CircleHelp } from "lucide-react";
import { DrawerAdminAction } from "./AppShellAdminAction";
import { DrawerMapAudioControl } from "./AppShellMapAudioControl";
import { DrawerMapCategoryControls } from "./AppShellMapCategoryControls";
import { DrawerMapLayerControls } from "./AppShellMapLayerControls";
import { DrawerPinnedMediaControl } from "./AppShellPinnedMediaControl";
import type {
  AppSection,
  AppShellAdminAction,
  AppShellMapAudioControl,
  AppShellMapCategoryControls,
  AppShellMapLayerControls,
  AppShellMapPinnedMediaControl,
  AppShellPrimaryItem,
} from "./appShellTypes";

type Props = {
  activeSection: AppSection;
  adminAction?: AppShellAdminAction;
  isOpen: boolean;
  mapAudioControl?: AppShellMapAudioControl;
  mapCategoryControls?: AppShellMapCategoryControls;
  mapLayerControls?: AppShellMapLayerControls;
  mapPinnedMediaControl?: AppShellMapPinnedMediaControl;
  primaryItems: AppShellPrimaryItem[];
  onAdminAction: () => void;
  onStartTour?: () => void;
  onClose: () => void;
};

export function AppShellDrawer({
  activeSection,
  adminAction,
  isOpen,
  mapAudioControl,
  mapCategoryControls,
  mapLayerControls,
  mapPinnedMediaControl,
  onAdminAction,
  onStartTour,
  onClose,
  primaryItems,
}: Props) {
  const isMapSection = activeSection === "map";

  return (
    <aside className={isOpen ? "side-drawer is-open" : "side-drawer"} id="app-side-drawer" aria-hidden={!isOpen}>
      <div className="drawer-header">
        {isMapSection ? (
          <button className="drawer-brand drawer-brand-button" type="button" onClick={onClose}>
            {APP_NAME}
          </button>
        ) : (
          <a className="drawer-brand" href="/">
            {APP_NAME}
          </a>
        )}
      </div>

      <nav className="drawer-section">
        {primaryItems.map(({ href, label, section, Icon }) =>
          section === activeSection ? (
            <button className="drawer-item is-active" type="button" key={section} onClick={onClose}>
              <Icon aria-hidden="true" size={26} />
              <span>{label}</span>
            </button>
          ) : (
            <a className="drawer-item" href={href} key={section}>
              <Icon aria-hidden="true" size={26} />
              <span>{label}</span>
            </a>
          ),
        )}
      </nav>

      {isMapSection && mapLayerControls ? (
        <DrawerMapLayerControls controls={mapLayerControls} onClose={onClose} />
      ) : null}
      {isMapSection && mapPinnedMediaControl ? (
        <DrawerPinnedMediaControl control={mapPinnedMediaControl} onClose={onClose} />
      ) : null}
      {isMapSection && mapAudioControl ? <DrawerMapAudioControl control={mapAudioControl} onClose={onClose} /> : null}
      {isMapSection && mapCategoryControls ? <DrawerMapCategoryControls controls={mapCategoryControls} /> : null}
      {adminAction ? <DrawerAdminAction action={adminAction} onClick={onAdminAction} /> : null}
      {isMapSection && onStartTour ? (
        <nav className="drawer-section" aria-label="Pomoc">
          <button className="drawer-item" type="button" onClick={onStartTour}>
            <CircleHelp aria-hidden="true" size={24} />
            <span>Samouczek</span>
          </button>
        </nav>
      ) : null}
    </aside>
  );
}
