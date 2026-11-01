import { expect, test } from "@playwright/test";

import { places } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { mockSharedApi } from "../support/visualApi";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test(`loading screen covers viewport, then fades into loaded map at ${viewport.width}px`, async ({ page }) => {
    let releasePlaces: () => void = () => {};
    const placesGate = new Promise<void>((resolve) => {
      releasePlaces = resolve;
    });

    await page.setViewportSize(viewport);
    await mockSharedApi(page);
    await page.route(`${API_URL}/api/places/map`, async (route) => {
      await placesGate;
      await route.fulfill({ json: places });
    });
    await page.goto("/");

    const splash = page.getByTestId("map-loading-screen");
    await expect(splash).toBeVisible();
    await expect(splash).toHaveCSS("position", "fixed");
    const rect = await splash.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.width).toBe(viewport.width);
    expect(rect!.height).toBe(viewport.height);
    await expect(page.locator(".map-loading-map")).toBeVisible();
    const illustration = await page.locator(".map-loading-map").boundingBox();
    expect(illustration).not.toBeNull();
    expect(illustration!.x).toBeGreaterThanOrEqual(-1);
    expect(illustration!.x + illustration!.width).toBeLessThanOrEqual(viewport.width + 1);
    await expect(page.locator(".map-status-panel")).toHaveCount(0);

    releasePlaces();
    await expect(page.locator(".place-map")).toBeVisible();
    await expect(splash).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator(".place-photo-marker")).not.toHaveCount(0);
  });
}

test("reduced motion shows static illustration and removes splash without fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-map")).toBeVisible();
  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 10_000 });
});
