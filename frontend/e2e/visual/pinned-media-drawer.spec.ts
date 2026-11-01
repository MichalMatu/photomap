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
  const attribution = page.getByTestId("map-attribution");
  const drawer = page.getByTestId("pinned-media-drawer");
  // Empty drawer is never visible: only an active drag reveals the drop zone.
  await expect(drawer).toHaveCount(0);
  await expect(attribution).not.toHaveClass(/map-attribution--with-drawer/);
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
  await expect(attribution).toHaveClass(/map-attribution--with-drawer/);
  await expect(page.getByRole("button", { name: `Otwórz podgląd: ${places[0].title}` })).toBeVisible();
  await expect(page.locator(".place-map")).toHaveClass(/place-map--drawer-open/);
  await expect(attribution).toHaveClass(/map-attribution--drawer-open/);
  const expandedCredit = await attribution.boundingBox();
  const expandedDrawer = await drawer.boundingBox();
  if (!expandedCredit || !expandedDrawer) throw new Error("Expanded drawer and attribution must be measurable");
  expect(expandedCredit.y + expandedCredit.height).toBeLessThanOrEqual(expandedDrawer.y - 4);
  // Collapsed drawer shows thumbnails only, with no header text or arrow.
  await drawer.getByRole("button", { name: "Zwiń szufladę zdjęć" }).click();
  await expect(drawer).not.toHaveClass(/is-open/);
  await expect(drawer.locator(".pinned-media-drawer-handle-thumbs img")).toHaveCount(1);
  await expect(drawer.locator(".pinned-media-drawer-handle svg")).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-handle")).not.toContainText("Przypięte");
  await drawer.getByRole("button", { name: "Rozwiń szufladę zdjęć" }).click();
  await expect(drawer).toHaveClass(/is-open/);
  await page.locator(".place-map").click({ position: { x: 25, y: 320 }, force: true });
  await expect(drawer).not.toHaveClass(/is-open/);
  await expect(drawer.locator(".pinned-media-drawer-handle-thumbs img")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Rozwiń szufladę zdjęć" }).click();
  await page.getByRole("button", { name: `Otwórz podgląd: ${places[0].title}` }).click();
  await expect(page.getByRole("dialog", { name: places[0].title })).toBeVisible();
  await expect(page.getByTestId("pinned-media-card")).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Otwórz podgląd: ${places[0].title}` })).toHaveCount(1);
  await page.getByRole("button", { name: "Zamknij modal" }).click();
  // Moving out of the drawer is still a drag gesture, never a single click.
  const dockedItem = page.getByRole("button", { name: `Otwórz podgląd: ${places[0].title}` });
  const thumbnail = await dockedItem.boundingBox();
  if (!thumbnail) throw new Error("Missing docked media thumbnail");
  await page.mouse.move(thumbnail.x + thumbnail.width / 2, thumbnail.y + 30);
  await page.mouse.down();
  await page.mouse.move(200, 300, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId("pinned-media-card")).toHaveCount(1);
  await expect(page.getByTestId("pinned-media-drawer")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: places[0].title })).toHaveCount(0);
  await page.getByTestId("pinned-media-card").click({ position: { x: 60, y: 55 } });
  await expect(page.getByRole("dialog", { name: places[0].title })).toBeVisible();
  await expect(page.getByTestId("pinned-media-card")).toHaveCount(1);
});
