import type { PinnedMediaBounds } from "./pinnedMediaBoardTypes";

/** The touch release can land above the collapsed handle: this is the magnetic drop zone. */
export function isPinnedMediaDrawerDropTarget(x: number, y: number, bounds: PinnedMediaBounds, drawerOpen: boolean) {
  const bottom = bounds.top + bounds.height;
  return (
    x >= bounds.left &&
    x <= bounds.left + bounds.width &&
    y >= bottom - (drawerOpen ? 196 : 110) &&
    y <= bottom + (drawerOpen ? 196 : 110)
  );
}
