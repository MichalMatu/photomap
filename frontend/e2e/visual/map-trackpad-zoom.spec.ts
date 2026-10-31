import { expect, test, type Page } from "@playwright/test";

import { places } from "../fixtures/visualData";
import { mockSharedApi } from "../support/visualApi";

type DebugMap = {
  getZoom: () => number;
  on: (name: string, cb: () => void) => void;
};

async function getMapZoom(page: Page): Promise<number> {
  return page.locator(".place-map").evaluate((element) => {
    const map = (element as HTMLElement & { __photomapDebugMap?: DebugMap }).__photomapDebugMap;
    if (!map) throw new Error("Dev-only map diagnostic hook missing");
    return map.getZoom();
  });
}

async function dispatchWheel(page: Page, deltaY: number, ctrlKey = true) {
  await dispatchWheelBurst(page, deltaY, 1, ctrlKey);
}

async function dispatchWheelBurst(page: Page, deltaY: number, count: number, ctrlKey = true) {
  await page.locator(".place-map").evaluate(
    (element, args) => {
      const rect = element.getBoundingClientRect();
      for (let index = 0; index < args.count; index++) {
        element.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            clientX: rect.x + rect.width / 2,
            clientY: rect.y + rect.height / 2,
            ctrlKey: args.ctrlKey,
            deltaMode: 0,
            deltaY: args.deltaY,
          }),
        );
      }
    },
    { deltaY, count, ctrlKey },
  );
}

async function setup(page: Page) {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker").first()).toBeVisible();
  await expect.poll(() => getMapZoom(page)).toBeGreaterThan(0);
}

test("pinch zooms in and back out continuously and settles near starting level", async ({ page }) => {
  await setup(page);
  const before = await getMapZoom(page);
  await dispatchWheel(page, -36);
  await expect.poll(() => getMapZoom(page)).toBeGreaterThan(before + 0.1);
  await page.waitForTimeout(400);
  const afterIn = await getMapZoom(page);
  await dispatchWheel(page, 36);
  await expect.poll(() => getMapZoom(page)).toBeLessThan(before + 0.1);
  await page.waitForTimeout(400);
  const afterOut = await getMapZoom(page);
  console.log("PINCH_TRACE", JSON.stringify({ before, afterIn, afterOut }));
  expect(Math.abs(afterOut - before)).toBeLessThan(0.03);
});

test("fine two-finger scroll and repeated zoom-out bursts do not stall", async ({ page }) => {
  await setup(page);
  const before = await getMapZoom(page);
  await dispatchWheelBurst(page, 12, 16, false);
  await page.waitForTimeout(450);
  const afterOut = await getMapZoom(page);
  console.log("SCROLL_TRACE", JSON.stringify({ before, afterOut }));
  expect(afterOut).toBeLessThan(before - 0.5);
  await dispatchWheelBurst(page, -12, 16, false);
  await page.waitForTimeout(450);
  const afterIn = await getMapZoom(page);
  console.log("SCROLL_RETURN_TRACE", JSON.stringify({ afterOut, afterIn }));
  expect(afterIn).toBeGreaterThan(afterOut + 0.5);
});

test("one continuous gesture emits one final zoomend instead of one per frame", async ({ page }) => {
  await setup(page);
  await page.locator(".place-map").evaluate((element) => {
    const map = (element as HTMLElement & { __photomapDebugMap?: DebugMap }).__photomapDebugMap;
    if (!map) throw new Error("Missing debug map");
    (element as HTMLElement & { __testZoomEndCount?: number }).__testZoomEndCount = 0;
    map.on("zoomend", () => {
      const el = element as HTMLElement & { __testZoomEndCount?: number };
      el.__testZoomEndCount = (el.__testZoomEndCount ?? 0) + 1;
    });
  });
  await dispatchWheelBurst(page, -12, 12);
  await page.waitForTimeout(500);
  const count = await page
    .locator(".place-map")
    .evaluate((el) => (el as HTMLElement & { __testZoomEndCount?: number }).__testZoomEndCount);
  console.log("ZOOMEND_TRACE", count);
  expect(count).toBe(1);
});

test("mouse wheel keeps its native Leaflet handler", async ({ page }) => {
  await setup(page);
  const before = await getMapZoom(page);
  await dispatchWheel(page, -100, false);
  await expect.poll(() => getMapZoom(page)).toBeGreaterThan(before);
});

test("dense map with 120 places can zoom out and in without stalls", async ({ page }) => {
  test.setTimeout(90_000);
  const densePlaces = Array.from({ length: 120 }, (_, index) => ({
    ...places[0],
    id: "zoom-stress-" + index,
    slug: "zoom-stress-" + index,
    title: "Zoom stress " + index,
    lat: places[0].lat + (Math.floor(index / 12) - 5) * 0.003,
    lon: places[0].lon + ((index % 12) - 5) * 0.004,
    score: 10 + index,
    weight: 1 + (index % 4),
  }));
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, densePlaces);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker").first()).toBeVisible();
  const markerCount = await page.locator(".place-photo-marker").count();
  expect(markerCount).toBeGreaterThan(3);
  const start = await getMapZoom(page);
  await dispatchWheelBurst(page, 8, 40, false);
  await page.waitForTimeout(550);
  const afterOut = await getMapZoom(page);
  expect(afterOut).toBeLessThan(start - 1);
  await dispatchWheelBurst(page, -8, 40, false);
  await page.waitForTimeout(550);
  const afterIn = await getMapZoom(page);
  expect(afterIn).toBeGreaterThan(afterOut + 1);
  console.log("DENSE_MAP_TRACE", JSON.stringify({ markerCount, start, afterOut, afterIn }));
});
