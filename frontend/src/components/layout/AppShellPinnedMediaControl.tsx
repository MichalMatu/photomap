import { Images } from "lucide-react";

import type { AppShellMapPinnedMediaControl } from "./appShellTypes";

type RailProps = {
  control: AppShellMapPinnedMediaControl;
};

type DrawerProps = RailProps & {
  onClose: () => void;
};

export function RailPinnedMediaControl({ control }: RailProps) {
  return (
    <nav className="rail-layer-nav" aria-label="Nakładki mapy">
      <button
        className={control.active ? "rail-layer-button is-active" : "rail-layer-button"}
        type="button"
        aria-pressed={control.active}
        title={control.label}
        onClick={control.onToggle}
      >
        <Images aria-hidden="true" size={22} />
        <span>{control.label}</span>
      </button>
    </nav>
  );
}

export function DrawerPinnedMediaControl({ control, onClose }: DrawerProps) {
  return (
    <nav className="drawer-section drawer-section--layers" aria-label="Nakładki mapy">
      <button
        className={control.active ? "drawer-item is-active" : "drawer-item"}
        type="button"
        aria-pressed={control.active}
        onClick={() => {
          control.onToggle();
          onClose();
        }}
      >
        <Images aria-hidden="true" size={24} />
        <span>{control.label}</span>
      </button>
    </nav>
  );
}
