import { describe, expect, it } from "vitest";
import { isPinnedMediaDrawerDropTarget } from "./pinnedMediaDrawerGeometry";
const bounds = {top: 0, left: 0, width: 360, height: 800};
describe("pinned drawer drop zone", () => {
  it("peeks only when a pointer is close to the bottom", () => {
    expect(isPinnedMediaDrawerDropTarget(200, 750, bounds, false)).toBe(true);
    expect(isPinnedMediaDrawerDropTarget(200, 640, bounds, false)).toBe(false);
    expect(isPinnedMediaDrawerDropTarget(-10, 790, bounds, false)).toBe(false);
  });
  it("accepts drops into an expanded drawer", () => {
    expect(isPinnedMediaDrawerDropTarget(300, 900, bounds, true)).toBe(true);
    expect(isPinnedMediaDrawerDropTarget(300, 1010, bounds, true)).toBe(false);
  });
});
