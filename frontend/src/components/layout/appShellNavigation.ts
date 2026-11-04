export type AppShellNavigationState = "collapsed" | "drawer";

export function getNextAppShellNavigationState(state: AppShellNavigationState): AppShellNavigationState {
  return state === "collapsed" ? "drawer" : "collapsed";
}

export type AppShellSwipeSurface = "edge" | "drawer" | "outside";

export function getSwipeAppShellNavigationState(
  current: AppShellNavigationState,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  surface: AppShellSwipeSurface,
): AppShellNavigationState {
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < 72 || Math.abs(dx) <= Math.abs(dy) * 1.45) return current;
  if (current === "collapsed") {
    return surface === "edge" && startX >= 24 && startX <= 76 && dx > 0 ? "drawer" : current;
  }
  return surface === "drawer" && dx < 0 ? "collapsed" : current;
}
