import { expect, test } from "@playwright/test";

import { API_URL } from "../support/config";
import { mockSharedApi } from "../support/visualApi";

test("failed map API closes the loading scene and exposes the error state", async ({ page }) => {
  await mockSharedApi(page);
  await page.route(`${API_URL}/api/places/map`, (route) =>
    route.fulfill({ status: 503, json: { detail: "Service temporarily unavailable" } }),
  );

  await page.goto("/");

  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByRole("alert")).toContainText("Nie udało się pobrać mapy");
  await expect(page.locator(".place-map")).toHaveCount(0);
});

test("a stalled tile server releases the map after the five-second fallback", async ({ page }) => {
  let releaseTiles: () => void = () => {};
  const pendingTiles = new Promise<void>((resolve) => {
    releaseTiles = resolve;
  });
  let requestedTiles = 0;

  await mockSharedApi(page);
  await page.route("https://*.tile.openstreetmap.org/**", async (route) => {
    requestedTiles += 1;
    await pendingTiles;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    });
  });

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("map-loading-screen")).toBeVisible();
    await expect.poll(() => requestedTiles).toBeGreaterThan(0);
    await expect(page.locator(".place-map")).toBeVisible();

    // Leaflet never signals TileLayer.load; the fallback must still expose the usable map.
    await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 12_000 });
    await expect(page.locator(".place-photo-marker")).not.toHaveCount(0);
    await expect(page.locator(".map-status-panel--error")).toHaveCount(0);
  } finally {
    releaseTiles();
  }
});
