import { BookOpen, MapPinned } from "lucide-react";
import type { AppShellPrimaryItem } from "./appShellTypes";

export const primaryItems: AppShellPrimaryItem[] = [
  { href: "/", label: "Mapa", section: "map", Icon: MapPinned },
  { href: "/guides", label: "Trasy", section: "guides", Icon: BookOpen },
];
