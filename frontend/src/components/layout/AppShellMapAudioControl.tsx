import { Volume2, VolumeX } from "lucide-react";

import type { AppShellMapAudioControl } from "./appShellTypes";

type DrawerProps = {
  control: AppShellMapAudioControl;
  onClose: () => void;
};

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
