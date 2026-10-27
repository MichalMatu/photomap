import { expect, test } from "@playwright/test";

import { mockSharedApi } from "../support/visualApi";

test("interactive PhotoMap tutorial follows real place, gallery and layer actions", async ({ page }) => {
  test.setTimeout(120_000); // Includes slow installed Chrome startup on a busy Mac.
  await page.setViewportSize({ width: 1280, height: 820 });
  await mockSharedApi(page, undefined, undefined, undefined, true, false);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const tour = page.locator(".map-tour");
  await expect(tour).toHaveAttribute("data-tour-step", "welcome");
  await page.getByRole("button", { name: "Odkrywaj" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "place");

  await expect(tour.locator(".map-tour-shade")).toHaveCount(0);
  await expect(tour.locator(".map-tour-spotlight")).toBeVisible();
  await expect(tour.getByRole("button", { name: "Dalej" })).toBeDisabled();
  const placeTile = page.locator(".place-photo-marker:not(.is-selected) > span").first();
  await expect(placeTile).toBeVisible();
  await placeTile.click();
  await expect(tour).toHaveAttribute("data-tour-step", "gallery");

  await expect(tour.getByRole("button", { name: "Dalej" })).toBeDisabled();
  const galleryTile = page.locator(".photo-gallery-marker > span").first();
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
  await expect(tour.getByRole("button", { name: "Dalej" })).toBeDisabled();
  await page.locator('.system-modal--media button[aria-label^="Przypnij"]').click();
  await expect(tour).toHaveAttribute("data-tour-step", "pinned");
  const card = page.locator(".pinned-media-card").first();
  await expect(card).toBeVisible();
  const ring = tour.locator(".map-tour-spotlight");
  await expect(ring).toBeVisible();
  const initial = await card.boundingBox();
  expect(initial).not.toBeNull();
  await page.mouse.move(initial!.x + 48, initial!.y + 45);
  await page.mouse.down();
  await page.mouse.move(initial!.x + 98, initial!.y + 80, { steps: 8 });
  await page.mouse.up();
  // The blue ring must follow the drag, not lag behind on a 400ms timer.
  await expect.poll(async () => {
    const bounds = await card.boundingBox();
    const glow = await ring.boundingBox();
    return bounds && glow ? Math.abs(bounds.x - glow.x - 2) + Math.abs(bounds.y - glow.y - 2) : 999;
  }).toBeLessThan(8);

  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "memory");
  await expect(tour.getByRole("button", { name: "Dalej" })).toBeDisabled();
  await expect(page.locator(".system-modal--media")).toHaveCount(0);
  await page.locator(".photo-gallery-add-marker > span").click();
  await expect(tour).toHaveAttribute("data-tour-step", "memory-form");
  await expect(page.locator(".memory-sheet-content")).toBeVisible();
  await expect(page.getByRole("button", { name: "generuj token" })).toBeVisible();

  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "layers");
  await expect(page.locator(".memory-sheet-content")).toHaveCount(0);
  await expect(page.locator("#app-side-drawer")).toHaveClass(/is-open/);

  await expect(tour.getByRole("button", { name: "Dalej" })).toBeDisabled();
  await page.locator("#app-side-drawer .drawer-section--layers button").first().click();
  await expect(tour).toHaveAttribute("data-tour-step", "routes");
  // Clicking a layer ordinarily closes the drawer. The walkthrough must keep it open
  // so the user can see the next target without being stranded.
  await expect(page.locator("#app-side-drawer")).toHaveClass(/is-open/);
  await expect(tour.locator(".map-tour-shade")).toHaveCount(0);

  await tour.getByRole("button", { name: "Dalej" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "done");
  await tour.getByRole("button", { name: "Zaczynam!" }).click();
  await expect(tour).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("photomap-public-map-tour-v3-complete"))).toBe("1");

  await page.getByRole("button", { name: "Pokaż pasek nawigacji" }).click();
  await page.getByRole("button", { name: "Otwórz menu" }).click();
  await page.getByRole("button", { name: "Samouczek" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "welcome");
  await tour.getByRole("button", { name: "Pomiń", exact: true }).click();
  await expect(tour).toHaveCount(0);
});

test("subtle blue outline guides a natural click without dimming the map", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 820 });
  await mockSharedApi(page, undefined, undefined, undefined, true, false);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const tour = page.locator(".map-tour");
  await expect(tour).toHaveAttribute("data-tour-step", "welcome");
  await tour.getByRole("button", { name: "Odkrywaj" }).click();
  await expect(tour.locator(".map-tour-shade")).toHaveCount(0);
  const halo = tour.locator(".map-tour-spotlight");
  await expect(halo).toBeVisible();
  await expect(halo).toHaveCSS("border-top-color", "rgba(55, 155, 255, 0.72)");
  const tiles = page.locator(".place-photo-marker:not(.is-selected) > span");
  await expect(tiles.first()).toBeVisible();
  await tiles.first().hover();
  await tiles.first().click();
  await expect(tour).toHaveAttribute("data-tour-step", "gallery");
  await tour.getByRole("button", { name: "Pomiń", exact: true }).click();
  await expect(tour).toHaveCount(0);
});

test("tour works with empty map on narrow mobile viewport", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 375, height: 667 });
  await mockSharedApi(page, [], undefined, undefined, true, false);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const tour = page.locator(".map-tour");
  await expect(tour).toHaveAttribute("data-tour-step", "welcome");
  await tour.getByRole("button", { name: "Odkrywaj" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "place");
  await expect(tour.getByText("Ta funkcja nie jest dostępna w aktualnym widoku. Możesz pominąć krok.")).toBeVisible();
  await tour.getByRole("button", { name: "Pomiń krok" }).click();
  await expect(tour).toHaveAttribute("data-tour-step", "layers");
  const rect = await tour.locator(".map-tour-card").boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(375);
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(667);
  await tour.getByRole("button", { name: "Pomiń", exact: true }).click();
  await expect(tour).toHaveCount(0);
});
