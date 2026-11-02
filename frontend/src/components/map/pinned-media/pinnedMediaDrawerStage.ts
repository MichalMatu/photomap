export type PinnedMediaDrawerStage = "collapsed" | "collection" | "discovery";
export const DRAWER_HOLD_MS = 520;

export function shiftDrawerStage(stage: PinnedMediaDrawerStage, direction: "up" | "down"): PinnedMediaDrawerStage {
  if (direction === "up") return stage === "collapsed" ? "collection" : "discovery";
  return stage === "discovery" ? "collection" : "collapsed";
}

export function isDrawerHoldMove(startX: number, startY: number, x: number, y: number): boolean {
  return Math.hypot(x - startX, y - startY) > 8;
}
