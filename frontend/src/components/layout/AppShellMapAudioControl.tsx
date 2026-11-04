import { Volume2, VolumeX } from "lucide-react";

import type { AppShellMapAudioControl } from "./appShellTypes";

type RailProps = {
  control: AppShellMapAudioControl;
};

type DrawerProps = RailProps & {
  onClose: () => void;
};

export function RailMapAudioControl({ control }: RailProps) {
  const AudioIcon = control.active ? Volume2 : VolumeX;

  return (
    <nav className="rail-layer-nav" aria-label="Audio mapy">
      <button
        className={control.active ? "rail-layer-button is-active" : "rail-layer-button"}
        type="button"
        aria-pressed={control.active}
        title={control.label}
        onClick={control.onToggle}
      >
        <AudioIcon aria-hidden="true" size={22} />
        <span>{control.label}</span>
      </button>
    </nav>
  );
}

export function DrawerMapAudioControl({ control, onClose }: DrawerProps) {
  const AudioIcon = control.active ? Volume2 : VolumeX;

  return (
    <nav className="drawer-section drawer-section--layers" aria-label="Audio mapy">
      <button
        className={control.active ? "drawer-item is-active" : "drawer-item"}
        type="button"
        aria-pressed={control.active}
        onClick={() => {
          control.onToggle();
          onClose();
        }}
      >
        <AudioIcon aria-hidden="true" size={24} />
        <span>{control.label}</span>
      </button>
    </nav>
  );
}
