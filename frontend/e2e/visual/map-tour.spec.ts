import { expect, test } from "@playwright/test";

import { mockSharedApi } from "../support/visualApi";

test("interactive PhotoMap tutorial follows real place, gallery and layer actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await mockSharedApi(page, undefined, undefined, undefined, true, false);
  await page.goto("/");

  const tour = page.locator(".map-tour");
  await expect(tour).toHaveAttribute("data-tour-step", "welcome");
  await page.getByRole("button", { name: "Odkrywaj" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "place");

  const placeTile = page.locator('.place-photo-marker:not(.is-selected) > span[data-map-tour-target="true"]');
  await expect(placeTile).toBeVisible();
  await expect(placeTile.locator("..")).not.toHaveAttribute("title");
  await placeTile.hover();
  await expect(placeTile).toHaveCSS("filter", "none");
  await placeTile.click();
  await expect(tour).toHaveAttribute("data-tour-step", "gallery");

  const galleryTile = page.locator('.photo-gallery-marker > span[data-map-tour-target="true"]');
  await expect(galleryTile).toBeVisible();
  await galleryTile.click();
  await expect(tour).toHaveAttribute("data-tour-step", "photo");
  await expect(page.locator(".system-modal--media")).toBeVisible();

  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "sound");
  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "narration");
  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "pin");
  await page.locator('.system-modal--media button[aria-label^="Przypnij"]').click();
  await expect(tour).toHaveAttribute("data-tour-step", "pinned");
  await expect(page.locator(".pinned-media-card")).toBeVisible();

  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "memory");
  await expect(page.locator(".system-modal--media")).toHaveCount(0);
  await page.locator('.photo-gallery-add-marker > span[data-map-tour-target="true"]').click();
  await expect(tour).toHaveAttribute("data-tour-step", "memory-form");
  await expect(page.locator(".memory-sheet-content")).toBeVisible();
  await expect(page.getByRole("button", { name: "generuj token" })).toBeVisible();

  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "layers");
  await expect(page.locator(".memory-sheet-content")).toHaveCount(0);
  await expect(page.locator("#app-side-drawer")).toHaveClass(/is-open/);

  await page.locator("#app-side-drawer .drawer-section--layers button").first().click();
  await expect(tour).toHaveAttribute("data-tour-step", "routes");
  // Clicking a layer ordinarily closes the drawer. The walkthrough must keep it open
  // so the user can see the next target without being stranded.
  await expect(page.locator("#app-side-drawer")).toHaveClass(/is-open/);
  await expect(tour.locator(".map-tour-spotlight")).toBeVisible();

  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "done");
  await tour.getByRole("button", { name: "Zaczynam!" }).click();
  await expect(tour).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("photomap-public-map-tour-v2-complete"))).toBe("1");

  await page.getByRole("button", { name: "Pokaż pasek nawigacji" }).click();
  await page.getByRole("button", { name: "Otwórz menu" }).click();
  await page.getByRole("button", { name: "Samouczek" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "welcome");
  await tour.getByRole("button", { name: "Pomiń" }).click();
  await expect(tour).toHaveCount(0);
});

test("tour works with empty map on narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mockSharedApi(page, [], undefined, undefined, true, false);
  await page.goto("/");

  const tour = page.locator(".map-tour");
  await expect(tour).toHaveAttribute("data-tour-step", "welcome");
  await tour.getByRole("button", { name: "Odkrywaj" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "place");
  await expect(tour.getByText("Element niedostępny w tym widoku. Możesz przejść dalej.")).toBeVisible();
  const rect = await tour.locator(".map-tour-card").boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(375);
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(667);
  await tour.getByRole("button", { name: "Pomiń" }).click();
  await expect(tour).toHaveCount(0);
});
