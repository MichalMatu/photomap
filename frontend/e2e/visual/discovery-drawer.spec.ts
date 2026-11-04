import { expect, test } from "@playwright/test";

import { places } from "../fixtures/visualData";
import { mockSharedApi } from "../support/visualApi";

test("desktop discovery drawer renders map recommendations and opens the existing place gallery", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockSharedApi(page);
  await page.goto("/");

  const drawer = page.getByTestId("pinned-media-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveClass(/is-open/);
  await expect(drawer.locator(".pinned-media-drawer-item--pinned")).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-item--recommended")).toHaveCount(2);
  await expect(drawer).toHaveAttribute("data-stage", "collection");

  const bounds = await drawer.boundingBox();
  if (!bounds) throw new Error("Discovery drawer is not measurable");
  expect(bounds.height).toBeGreaterThanOrEqual(300);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(801);
  await expect(page.locator(".place-map")).toHaveClass(/place-map--drawer-open/);
  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 15_000 });
  await page.screenshot({ path: testInfo.outputPath("desktop-discovery-expanded.png"), animations: "disabled" });

  await drawer.getByRole("button", { name: `Pokaż na mapie: ${places[0].title}` }).click();
  await expect(page.locator(".photo-gallery-marker").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desktop-discovery-place-gallery.png"), animations: "disabled" });
});
