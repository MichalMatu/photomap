export type PinnedMediaDrawerStage = "collapsed" | "collection" | "discovery";
export const DRAWER_HOLD_MS = 520;

export function shiftDrawerStage(stage: PinnedMediaDrawerStage, direction: "up" | "down"): PinnedMediaDrawerStage {
  if (direction === "up") return stage === "collapsed" ? "collection" : "discovery";
  return stage === "discovery" ? "collection" : "collapsed";
}

export function isDrawerHoldMove(startX: number, startY: number, x: number, y: number): boolean {
  return Math.hypot(x - startX, y - startY) > 8;
}

export const DRAWER_COLLAPSED_HEIGHT = 80;
export const DRAWER_DRAG_THRESHOLD = 8;
export const DRAWER_CLOSE_THRESHOLD = 140;

export function drawerHeightLimits(viewportWidth: number, viewportHeight: number) {
  const mobile = viewportWidth <= 600;
  return {
    collection: Math.min(mobile ? 300 : 340, viewportHeight * (mobile ? 0.38 : 0.42)),
    discovery: Math.max(DRAWER_COLLAPSED_HEIGHT, Math.min(mobile ? 620 : 670, viewportHeight * 0.72)),
  };
}

export function clampDrawerHeight(height: number, maximum: number): number {
  return Math.max(DRAWER_COLLAPSED_HEIGHT, Math.min(maximum, height));
}

export function drawerStageForHeight(height: number, collectionHeight: number): PinnedMediaDrawerStage {
  if (height <= DRAWER_CLOSE_THRESHOLD) return "collapsed";
  return height > collectionHeight + 60 ? "discovery" : "collection";
}
