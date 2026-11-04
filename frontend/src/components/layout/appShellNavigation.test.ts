import { describe, expect, it } from "vitest";
import {
  getNextAppShellNavigationState,
  getSwipeAppShellNavigationState,
  type AppShellNavigationState,
} from "./appShellNavigation";

describe("app shell navigation", () => {
  it("opens and closes the menu in a single click", () => {
    const states: AppShellNavigationState[] = ["collapsed"];
    states.push(getNextAppShellNavigationState(states[0]));
    states.push(getNextAppShellNavigationState(states[1]));
    expect(states).toEqual(["collapsed", "drawer", "collapsed"]);
  });

  it("preserves map gestures while allowing deliberate edge open and menu close", () => {
    const swipe = getSwipeAppShellNavigationState;
    expect(swipe("collapsed", 46, 300, 170, 303, "edge")).toBe("drawer");
    expect(swipe("drawer", 170, 300, 50, 303, "drawer")).toBe("collapsed");
    expect(swipe("collapsed", 180, 300, 330, 301, "outside")).toBe("collapsed");
    expect(swipe("collapsed", 6, 300, 170, 301, "edge")).toBe("collapsed");
    expect(swipe("collapsed", 46, 300, 170, 500, "edge")).toBe("collapsed");
    expect(swipe("drawer", 300, 300, 30, 301, "outside")).toBe("drawer");
  });
);
