import type { LucideIcon } from "lucide-react";
import type { MapMarkerMode } from "../map/mapMarkerMode";

export type AppSection = "map" | "admin" | "guides" | "places";

export type AppShellAdminAction = {
  label: string;
  onClick: () => void;
  shortLabel: string;
};

export type AppShellMapLayerControls = {
  items: Array<{
    active: boolean;
    count: number;
    id: string;
    label: string;
  }>;
  onToggle: (layerId: string) => void;
};

export type AppShellMapMarkerModeControl = {
  mode: MapMarkerMode;
  onChange: (mode: MapMarkerMode) => void;
};

export type AppShellMapPinnedMediaControl = {
  active: boolean;
  label: string;
  onToggle: () => void;
};

export type AppShellMapAudioControl = {
  active: boolean;
  label: string;
  onToggle: () => void;
};

export type AppShellMapCategoryControls = {
  items: Array<{
    active: boolean;
    count: number;
    icon: string;
    id: string;
    label: string;
  }>;
  onClear: () => void;
  onToggle: (categoryId: string) => void;
  selectedCount: number;
};

export type AppShellPrimaryItem = {
  href: string;
  Icon: LucideIcon;
  label: string;
  railLabel?: string;
  section: AppSection;
};
