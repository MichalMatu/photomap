import type { PinnedMediaBounds } from "./pinnedMediaBoardTypes";

/** The touch release can land above the collapsed handle: this is the magnetic drop zone. */
export function isPinnedMediaDrawerDropTarget(x: number, y: number, bounds: PinnedMediaBounds, drawerOpen: boolean) {
  // The map shrinks while the drawer is expanded; use the actual drawer
  // rectangle instead of the shortened map bounds for drop detection.
  if (drawerOpen && typeof document !== "undefined") {
    const drawer = document.querySelector<HTMLElement>(".pinned-media-drawer");
    const rect = drawer?.getBoundingClientRect();
    if (rect && rect.height > 0) {
      return x >= rect.left && x <= rect.right && y >= rect.top - 16 && y <= rect.bottom + 24;
    }
  }
  const bottom = bounds.top + bounds.height;
  return (
    x >= bounds.left &&
    x <= bounds.left + bounds.width &&
    y >= bottom - (drawerOpen ? 196 : 110) &&
    y <= bottom + (drawerOpen ? 196 : 110)
  );
}
