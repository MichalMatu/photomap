import { describe, expect, it } from "vitest";
import { DRAWER_HOLD_MS, isDrawerHoldMove, shiftDrawerStage } from "./pinnedMediaDrawerStage";

describe("pinned drawer 3-stage navigation", () => {
  it("expands and collapses one stage at a time", () => {
    expect(shiftDrawerStage("collapsed", "up")).toBe("collection");
    expect(shiftDrawerStage("collection", "up")).toBe("discovery");
    expect(shiftDrawerStage("discovery", "down")).toBe("collection");
    expect(shiftDrawerStage("collection", "down")).toBe("collapsed");
    expect(shiftDrawerStage("collapsed", "down")).toBe("collapsed");
    expect(shiftDrawerStage("discovery", "up")).toBe("discovery");
  });
  it("holds steady while scrolling before activating remove", () => {
    expect(DRAWER_HOLD_MS).toBeGreaterThanOrEqual(500);
    expect(isDrawerHoldMove(100, 200, 104, 204)).toBe(false);
    expect(isDrawerHoldMove(100, 200, 120, 200)).toBe(true);
  });
});
