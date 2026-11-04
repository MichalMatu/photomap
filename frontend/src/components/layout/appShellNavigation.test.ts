import { describe, expect, it } from "vitest";
import {
  getNextAppShellNavigationState,
  getSwipeAppShellNavigationState,
  type AppShellNavigationState,
} from "./appShellNavigation";

describe("app shell navigation", () => {
  it("cycles collapsed rail drawer collapsed", () => {
    const cycle: AppShellNavigationState[] = ["collapsed"];
    cycle.push(getNextAppShellNavigationState(cycle[cycle.length - 1]));
    cycle.push(getNextAppShellNavigationState(cycle[cycle.length - 1]));
    cycle.push(getNextAppShellNavigationState(cycle[cycle.length - 1]));
    expect(cycle).toEqual(["collapsed", "rail", "drawer", "collapsed"]);
  });
  it("swipes both ways without intercepting a map pan, Android back edge or vertical scrolling", () => {
    const swipe = getSwipeAppShellNavigationState;
    expect(swipe("collapsed", 46, 300, 170, 303, "edge")).toBe("rail");
    expect(swipe("rail", 45, 300, 170, 303, "rail")).toBe("drawer");
    expect(swipe("drawer", 170, 300, 50, 303, "drawer")).toBe("rail");
    expect(swipe("rail", 90, 300, 6, 303, "rail")).toBe("collapsed");
    expect(swipe("rail", 60, 300, 7, 303, "rail")).toBe("collapsed");
    expect(swipe("collapsed", 180, 300, 330, 301, "outside")).toBe("collapsed");
    expect(swipe("collapsed", 6, 300, 170, 301, "edge")).toBe("collapsed");
    expect(swipe("collapsed", 46, 300, 170, 500, "edge")).toBe("collapsed");
    expect(swipe("drawer", 300, 300, 30, 301, "outside")).toBe("drawer");
  });
});
