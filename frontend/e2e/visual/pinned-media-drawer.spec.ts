import { expect, test } from "@playwright/test";

import { places, rynekSide } from "../fixtures/visualData";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

test("mobile pin mode and bottom drawer survive reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");

  const openMapMenu = async () => {
    await page.getByRole("button", { name: "Pokaż pasek nawigacji" }).click();
    await page.getByRole("button", { name: "Otwórz menu" }).click();
  };
  await openMapMenu();
  await page.getByRole("navigation", { name: "Widok mapy" }).getByRole("button", { name: "Pinezki" }).click();
  await expect(page.locator(".place-map-pin-marker").first()).toBeVisible();
  await expect(page.locator(".map-marker-mode-toggle")).toHaveCount(0);
  await page.reload();
  await openMapMenu();
  await expect(
    page.getByRole("navigation", { name: "Widok mapy" }).getByRole("button", { name: "Pinezki" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("navigation", { name: "Widok mapy" }).getByRole("button", { name: "Miniatury" }).click();

  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekSide.caption ?? places[0].title);
  await page.getByRole("dialog", { name: places[0].title }).getByRole("button", { name: "Przypnij zdjęcie" }).click();

  const card = page.getByTestId("pinned-media-card");
  await expect(card).toHaveCount(1);
  await expect(card.locator(".pinned-media-card-caption-toggle")).toHaveCount(0);
  await expect(card.locator(".pinned-media-card-dock")).toHaveCount(0);
  await expect(card.locator(".pinned-media-card-map-link")).toHaveCount(1);
  await expect(card.locator(".pinned-media-card-remove")).toHaveCount(1);
  const frame = await card.boundingBox();
  if (!frame) throw new Error("Pinned card not visible");
  await page.mouse.move(frame.x + frame.width / 2, frame.y + 28);
  await page.mouse.down();
  await page.mouse.move(190, 825, { steps: 12 });
  await expect(page.getByTestId("pinned-media-drawer")).toHaveClass(/is-drop-active/);
  await page.mouse.up();

  await expect(page.getByTestId("pinned-media-card")).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Przenieś na mapę: ${places[0].title}` })).toBeVisible();
  await expect(page.locator(".place-map")).toHaveClass(/place-map--drawer-open/);
  await page.reload();
  await page.getByRole("button", { name: "Rozwiń szufladę zdjęć" }).click();
  await page.getByRole("button", { name: `Przenieś na mapę: ${places[0].title}` }).click();
  await expect(page.getByTestId("pinned-media-card")).toHaveCount(1);
});
