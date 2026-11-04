import {
  Binoculars,
  BookOpen,
  CloudRain,
  Coffee,
  Coins,
  Heart,
  Landmark,
  Layers,
  MapPinned,
  MessageSquare,
  Moon,
  Palette,
  Sandwich,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import type { AppShellPrimaryItem } from "./appShellTypes";

export const primaryItems: AppShellPrimaryItem[] = [
  { href: "/", label: "Mapa", section: "map", Icon: MapPinned },
  { href: "/guides", label: "Trasy", railLabel: "Trasa", section: "guides", Icon: BookOpen },
];

const mapLayerIcons: Record<string, LucideIcon> = {
  all: Layers,
  featured: Sparkles,
  places: MapPinned,
  memories: MessageSquare,
};

const mapCategoryIcons: Record<string, LucideIcon> = {
  binoculars: Binoculars,
  "cloud-rain": CloudRain,
  coffee: Coffee,
  coins: Coins,
  heart: Heart,
  landmark: Landmark,
  moon: Moon,
  palette: Palette,
  sandwich: Sandwich,
  sparkles: Sparkles,
  utensils: Utensils,
};

export const MAX_RAIL_CATEGORY_BUTTONS = 6;

export function getMapLayerIcon(layerId: string) {
  return mapLayerIcons[layerId] ?? Sparkles;
}

export function getMapCategoryIcon(icon: string) {
  return mapCategoryIcons[icon] ?? Sparkles;
}
