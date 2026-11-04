export type AppShellNavigationState = "collapsed" | "rail" | "drawer";

const nextNavigationState: Record<AppShellNavigationState, AppShellNavigationState> = {
  collapsed: "rail",
  drawer: "collapsed",
  rail: "drawer",
};

export function getNextAppShellNavigationState(currentState: AppShellNavigationState): AppShellNavigationState {
  return nextNavigationState[currentState];
}

export type AppShellSwipeSurface = "edge" | "rail" | "drawer" | "outside";

export function getSwipeAppShellNavigationState(
  current: AppShellNavigationState,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  surface: AppShellSwipeSurface,
): AppShellNavigationState {
  const dx = endX - startX,
    dy = endY - startY;
  const threshold = current === "rail" && dx < 0 ? 42 : 72;
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy) * 1.45) return current;
  if (current === "collapsed") return surface === "edge" && startX >= 24 && startX <= 76 && dx > 0 ? "rail" : current;
  if (current === "rail" && surface === "rail") return dx > 0 ? "drawer" : "collapsed";
  if (current === "drawer" && surface === "drawer" && dx < 0) return "rail";
  return current;
}
