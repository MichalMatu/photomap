import { expect, test, type Page } from "@playwright/test";

import { mockSharedApi } from "../support/visualApi";

async function markerWidth(page: Page) {
  const box = await page.locator(".place-photo-marker").first().boundingBox();
  if (!box) {
    throw new Error("Map marker is not visible.");
  }
  return box.width;
}

async function dispatchPinch(page: Page, deltaY: number) {
  const map = page.locator(".place-map");
  const box = await map.boundingBox();
  if (!box) {
    throw new Error("Map is not visible.");
  }

  await map.dispatchEvent("wheel", {
    bubbles: true,
    cancelable: true,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    ctrlKey: true,
    deltaMode: 0,
    deltaY,
  });
}

async function settledMarkerWidth(page: Page) {
  await page.waitForTimeout(450);
  return markerWidth(page);
}

test("Mac-style trackpad pinch responds to a sub-threshold delta and reverses smoothly", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker").first()).toBeVisible();

  const initialWidth = await settledMarkerWidth(page);
  await dispatchPinch(page, -36);
  const enlargedWidth = await settledMarkerWidth(page);
  expect(enlargedWidth).toBeGreaterThan(initialWidth);

  await dispatchPinch(page, 36);
  const reversedWidth = await settledMarkerWidth(page);
  expect(Math.abs(reversedWidth - initialWidth)).toBeLessThan(1);
});

test("Mac-style trackpad pinch bounds a burst without quarter-step jumps", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker").first()).toBeVisible();

  const initialWidth = await settledMarkerWidth(page);
  await dispatchPinch(page, -36);
  const smallPinchWidth = await settledMarkerWidth(page);
  await page.reload();
  await expect(page.locator(".place-photo-marker").first()).toBeVisible();
  await dispatchPinch(page, -600);
  const burstWidth = await settledMarkerWidth(page);
  expect(burstWidth).toBeGreaterThan(smallPinchWidth);
  expect(burstWidth).toBeGreaterThan(initialWidth);
});
