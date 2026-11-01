import { Layers } from "lucide-react";
import { getMapLayerIcon } from "./appShellItems";
import type { AppShellMapLayerControls as AppShellMapLayerControlsType } from "./appShellTypes";

type RailProps = { onOpenDrawer: () => void };

type DrawerProps = { controls: AppShellMapLayerControlsType; onClose: () => void };

const CompactRailLayerControl = ({ onOpenDrawer }: RailProps) => (
  <nav className="rail-layer-nav" aria-label="Warstwy mapy">
    <button className="rail-layer-button" type="button" onClick={onOpenDrawer} aria-label="Otwórz warstwy mapy">
      <Layers size={24} aria-hidden="true" />
      <span>Warstwy</span>
    </button>
  </nav>
);
export const RailMapLayerControls = CompactRailLayerControl;

export function DrawerMapLayerControls({ controls, onClose }: DrawerProps) {
  return (
    <nav className="drawer-section drawer-section--layers" aria-label="Warstwy mapy">
      {controls.items.map((item) => {
        const LayerIcon = getMapLayerIcon(item.id);
        return (
          <button
            className={item.active ? "drawer-item is-active" : "drawer-item"}
            type="button"
            key={item.id}
            aria-pressed={item.active}
            onClick={() => {
              controls.onToggle(item.id);
              onClose();
            }}
          >
            <LayerIcon aria-hidden="true" size={24} />
            <span>{item.label}</span>
            <strong className="drawer-layer-count">{item.count}</strong>
          </button>
        );
      })}
    </nav>
  );
}
