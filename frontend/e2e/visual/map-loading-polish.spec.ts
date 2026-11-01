import { expect, test } from "@playwright/test";

import { places } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { mockSharedApi } from "../support/visualApi";

test("illustrated map animates once, keeps pins and photos visible while data loads", async ({ page }) => {
  let releasePlaces: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releasePlaces = resolve;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.route(`${API_URL}/api/places/map`, async (route) => {
    await gate;
    await route.fulfill({ json: places });
  });
  await page.goto("/");

  const splash = page.getByTestId("map-loading-screen");
  await expect(splash).toBeVisible();
  await expect(page.locator(".map-loading-map")).toBeVisible();

  const getAnimation = () =>
    page.locator(".map-loading-pin--one").evaluate((node) => {
      const style = getComputedStyle(node);
      return { opacity: Number(style.opacity), iterationCount: style.animationIterationCount };
    });

  await expect.poll(async () => (await getAnimation()).opacity).toBe(1);
  await expect
    .poll(async () =>
      page.locator(".map-loading-photo--three").evaluate((node) => Number(getComputedStyle(node).opacity)),
    )
    .toBe(1);
  expect((await getAnimation()).iterationCount).toBe("1");

  await page.waitForTimeout(1600);
  expect((await getAnimation()).opacity).toBe(1);
  expect(
    await page.locator(".map-loading-route").first().evaluate((node) => Number.parseFloat(getComputedStyle(node).strokeDashoffset)),
  ).toBe(0);
  await expect(splash).toBeVisible();

  releasePlaces();
  await expect(splash).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".place-map")).toBeVisible();
});

test("reduced motion immediately shows the completed artwork without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let releasePlaces: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releasePlaces = resolve;
  });
  await mockSharedApi(page);
  await page.route(`${API_URL}/api/places/map`, async (route) => {
    await gate;
    await route.fulfill({ json: places });
  });
  await page.goto("/");

  const photo = page.locator(".map-loading-photo--one");
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  expect(
    await page.locator(".map-loading-route").first().evaluate((node) => Number.parseFloat(getComputedStyle(node).strokeDashoffset)),
  ).toBe(0);

  releasePlaces();
  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 10_000 });
});
