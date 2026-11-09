import { describe, expect, it } from "vitest";
import {
  DRAWER_COLLAPSED_HEIGHT,
  DRAWER_HOLD_MS,
  clampDrawerHeight,
  drawerHeightLimits,
  drawerStageForHeight,
  isDrawerHoldMove,
  shiftDrawerStage,
} from "./pinnedMediaDrawerStage";

describe("pinned drawer 3-stage navigation", () => {
  it("expands and collapses one stage at a time", () => {
    expect(shiftDrawerStage("collapsed", "up")).toBe("collection");
    expect(shiftDrawerStage("collection", "up")).toBe("discovery");
    expect(shiftDrawerStage("discovery", "down")).toBe("collection");
    expect(shiftDrawerStage("collection", "down")).toBe("collapsed");
    expect(shiftDrawerStage("collapsed", "down")).toBe("collapsed");
    expect(shiftDrawerStage("discovery", "up")).toBe("discovery");
  });
  it("supports arbitrary drawer heights between a collapsed tray and the viewport limit", () => {
    const desktop = drawerHeightLimits(1280, 800);
    const mobile = drawerHeightLimits(390, 844);
    expect(desktop).toEqual({ collection: 336, discovery: 576 });
    expect(mobile).toEqual({ collection: 300, discovery: 607.68 });
    expect(clampDrawerHeight(-100, desktop.discovery)).toBe(DRAWER_COLLAPSED_HEIGHT);
    expect(clampDrawerHeight(245, desktop.discovery)).toBe(245);
    expect(clampDrawerHeight(900, desktop.discovery)).toBe(desktop.discovery);
    expect(drawerStageForHeight(120, desktop.collection)).toBe("collapsed");
    expect(drawerStageForHeight(245, desktop.collection)).toBe("collection");
    expect(drawerStageForHeight(410, desktop.collection)).toBe("discovery");
  });

  it("holds steady while scrolling before activating remove", () => {
    expect(DRAWER_HOLD_MS).toBeGreaterThanOrEqual(500);
    expect(isDrawerHoldMove(100, 200, 104, 204)).toBe(false);
    expect(isDrawerHoldMove(100, 200, 120, 200)).toBe(true);
  });
});
