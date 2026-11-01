import { expect, test } from "@playwright/test";

import type { AppConfig, PlaceMapItem } from "../../src/api/types";
import { appConfig, places } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { mockSharedApi } from "../support/visualApi";

test("pins retain all viewport places when photo tile density is restrictive", async ({ page }) => {
  const visiblePlaces: PlaceMapItem[] = Array.from({ length: 40 }, (_, index) => {
    const basePlace = places[index % places.length] as PlaceMapItem;
    return {
      ...basePlace,
      id: `coverage-place-${index}`,
      slug: `coverage-place-${index}`,
      title: `Punkt testowy ${index}`,
      lat: 51.1079 + (index % 5) * 0.001,
      lon: 17.0385 + Math.floor(index / 5) * 0.001,
    };
  });
  visiblePlaces[0] = { ...visiblePlaces[0], cover_photo: null, preview_items: [] };

  const sparseConfig: AppConfig = {
    ...(appConfig as AppConfig),
    map: {
      ...appConfig.map,
      marker_density: {
        full_density_zoom: 15,
        marker_viewport_area: 60_000,
        max_zoom_fill_ratio: 0.5,
        min_zoom: 6,
        min_zoom_fill_ratio: 0.05,
        zoom_curve: 1.8,
      },
    },
  };

  await page.setViewportSize({ width: 1280, height: 820 });
  await page.addInitScript(() => window.localStorage.setItem("photomap:map-marker-mode:v1", "pins"));
  await mockSharedApi(page, visiblePlaces);
  await page.route(`${API_URL}/api/app-config`, (route) => route.fulfill({ json: sparseConfig }));
  await page.goto("/");

  await expect(page.locator(".place-map-pin-marker")).toHaveCount(40);
  await expect(page.locator(".place-photo-marker")).toHaveCount(0);
  await expect(page.locator('[title="Punkt testowy 0"]')).toHaveCount(1);

  await page.evaluate(() => window.localStorage.setItem("photomap:map-marker-mode:v1", "photos"));
  await page.reload();

  await expect(page.locator(".place-map-pin-marker")).toHaveCount(0);
  await expect.poll(async () => page.locator(".place-photo-marker").count()).toBeGreaterThan(0);
  expect(await page.locator(".place-photo-marker").count()).toBeLessThan(40);
});
