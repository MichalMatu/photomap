import { expect, test } from "@playwright/test";

import { places, rynekSide } from "../fixtures/visualData";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

test("mobile pin mode and bottom drawer survive reload", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");

  const openMapView = async () => {
    await page.getByRole("button", { name: "Ustawienia widoku mapy" }).click();
  };
  await openMapView();
  await page.getByRole("button", { name: "Pinezki" }).click();
  await expect(page.locator(".place-map-pin-marker").first()).toBeVisible();
  await expect(page.locator(".map-marker-mode-toggle")).toHaveCount(0);
  await page.reload();
  await openMapView();
  await expect(page.getByRole("button", { name: "Pinezki" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Miniatury" }).click();
  await page.locator("#map-tools-panel").getByRole("button", { name: "Zamknij panel" }).click();

  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekSide.caption ?? places[0].title);
  await page.getByRole("dialog", { name: places[0].title }).getByRole("button", { name: "Przypnij zdjęcie" }).click();

  const card = page.getByTestId("pinned-media-card");
  await expect(card).toHaveCount(1);
  const attribution = page.getByTestId("map-attribution");
  const drawer = page.getByTestId("pinned-media-drawer");
  // The map stays full-height until the user explicitly opens discovery.
  await expect(drawer).toHaveAttribute("data-stage", "collapsed");
  await drawer.getByRole("button", { name: "Rozwiń szufladę zdjęć" }).click();
  await expect(drawer.getByRole("button", { name: `Pokaż na mapie: ${places[0].title}` })).toBeVisible();
  await expect(attribution).toHaveClass(/map-attribution--with-drawer/);
  await page.screenshot({
    path: testInfo.outputPath("mobile-discovery-with-floating-photo.png"),
    animations: "disabled",
  });
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
  await expect(drawer.locator(".pinned-media-drawer-item--pinned")).toHaveCount(1);
  await expect(drawer.locator(".pinned-media-drawer-item--recommended")).toHaveCount(0);
  await expect(drawer).toHaveAttribute("data-stage", "collection");
  await drawer.getByRole("button", { name: "Więcej zdjęć" }).click();
  await expect(drawer).toHaveAttribute("data-stage", "discovery");
  await expect(drawer.locator(".pinned-media-drawer-item--recommended")).toHaveCount(2);
  await expect(drawer.locator(".pinned-media-drawer-item").first()).toHaveClass(/pinned-media-drawer-item--pinned/);
  // Holding arms the central remove button; outside click disarms without deleting.
  const pinnedItem = drawer.locator(".pinned-media-drawer-item--pinned").first();
  // Wait until the expanding drawer settles before starting a real mouse hold.
  await pinnedItem.hover();
  await page.mouse.down();
  await page.waitForTimeout(620);
  await expect(drawer.getByRole("button", { name: `Usuń z kolekcji: ${places[0].title}` })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole("dialog", { name: places[0].title })).toHaveCount(0);
  await drawer.locator(".pinned-media-drawer-section-label").first().click();
  await expect(drawer.locator(".pinned-media-drawer-remove")).toHaveCount(0);
  await pinnedItem.click();
  await expect(page.getByRole("dialog", { name: places[0].title })).toBeVisible();
  await page.getByRole("button", { name: "Zamknij modal" }).click();
  await page.screenshot({
    path: testInfo.outputPath("mobile-discovery-expanded-with-pinned-first.png"),
    animations: "disabled",
  });
  await expect(page.locator(".place-map")).toHaveClass(/place-map--drawer-open/);
  await expect(attribution).toHaveClass(/map-attribution--drawer-open/);
  const expandedCredit = await attribution.boundingBox();
  const expandedDrawer = await drawer.boundingBox();
  if (!expandedCredit || !expandedDrawer) throw new Error("Expanded drawer and attribution must be measurable");
  expect(expandedCredit.y + expandedCredit.height).toBeLessThanOrEqual(expandedDrawer.y - 4);
  // Full-bleed thumbnails must not sit inside another framed or padded tile.
  const tile = drawer.locator(".pinned-media-drawer-item").first();
  const expandedStyle = await tile.evaluate((element) => {
    const style = getComputedStyle(element);
    const image = element.querySelector("img");
    if (!image) throw new Error("Missing expanded drawer image");
    return {
      background: style.backgroundColor,
      border: style.borderTopWidth,
      padding: style.paddingLeft,
      imageHeight: image.getBoundingClientRect().height,
      imageWidth: image.getBoundingClientRect().width,
      tileWidth: element.getBoundingClientRect().width,
    };
  });
  expect(expandedStyle.background).toBe("rgba(0, 0, 0, 0)");
  expect(expandedStyle.border).toBe("0px");
  expect(expandedStyle.padding).toBe("0px");
  expect(expandedStyle.imageWidth).toBe(expandedStyle.tileWidth);
  expect(expandedStyle.imageHeight).toBeGreaterThanOrEqual(90);
  // Collapsed drawer shows thumbnails only, with no header text or arrow.
  await drawer.getByRole("button", { name: "Mniej zdjęć" }).click();
  await expect(drawer).toHaveAttribute("data-stage", "collection");
  await drawer
    .getByRole("button", { name: "Zwiń szufladę zdjęć" })
    .dispatchEvent("pointerdown", { pointerId: 10, clientY: 250 });
  await drawer
    .getByRole("button", { name: "Zwiń szufladę zdjęć" })
    .dispatchEvent("pointerup", { pointerId: 10, clientY: 310 });
  await expect(drawer).toHaveAttribute("data-stage", "collapsed");
  await expect(drawer).not.toHaveClass(/is-open/);
  await expect(drawer.locator(".pinned-media-drawer-handle-thumbs img")).toHaveCount(1);
  const collapsedThumb = drawer.locator(".pinned-media-drawer-handle-thumbs img").first();
  const thumbBox = await collapsedThumb.boundingBox();
  const handleBox = await drawer.locator(".pinned-media-drawer-handle").boundingBox();
  if (!thumbBox || !handleBox) throw new Error("Collapsed thumbnail or handle is missing");
  expect(thumbBox.width).toBeGreaterThanOrEqual(50);
  expect(thumbBox.height).toBeGreaterThanOrEqual(38);
  expect(handleBox.height).toBeGreaterThanOrEqual(thumbBox.height + 8);
  // Wait for the slide-down transition before measuring the attribution clearance.
  await expect
    .poll(async () => {
      const collapsedCredit = await attribution.boundingBox();
      const collapsedDrawer = await drawer.boundingBox();
      if (!collapsedCredit || !collapsedDrawer) return -1;
      return collapsedDrawer.y - (collapsedCredit.y + collapsedCredit.height);
    })
    .toBeGreaterThanOrEqual(4);
  await page.screenshot({ path: testInfo.outputPath("mobile-discovery-collapsed.png"), animations: "disabled" });
  await expect(drawer.locator(".pinned-media-drawer-grab-line")).toHaveCount(1);
  await expect(drawer.locator(".pinned-media-drawer-handle svg")).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-handle")).not.toContainText("Przypięte");
  await drawer.getByRole("button", { name: "Rozwiń szufladę zdjęć" }).click();
  await expect(drawer).toHaveClass(/is-open/);
  await page.locator(".place-map").click({ position: { x: 25, y: 320 }, force: true });
  await expect(drawer).not.toHaveClass(/is-open/);
  await expect(drawer.locator(".pinned-media-drawer-handle-thumbs img")).toHaveCount(1);
  await page.reload();
  await expect(drawer).toHaveAttribute("data-stage", "collapsed");
  await drawer.getByRole("button", { name: "Rozwiń szufladę zdjęć" }).click();
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
  await expect(drawer.locator(".pinned-media-drawer-item--pinned")).toHaveCount(0);
  await expect(page.getByTestId("pinned-media-drawer")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mobile-discovery-after-undock.png"), animations: "disabled" });
  await expect(page.getByRole("dialog", { name: places[0].title })).toHaveCount(0);
  await page.getByTestId("pinned-media-card").click({ position: { x: 60, y: 55 } });
  await expect(page.getByRole("dialog", { name: places[0].title })).toBeVisible();
  await expect(page.getByTestId("pinned-media-card")).toHaveCount(1);
});

test("long hold removes only the pinned collection entry after central button click", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekSide.caption ?? places[0].title);
  await page.getByRole("dialog", { name: places[0].title }).getByRole("button", { name: "Przypnij zdjęcie" }).click();

  const card = page.getByTestId("pinned-media-card");
  await expect(card).toHaveCount(1);
  const frame = await card.boundingBox();
  if (!frame) throw new Error("Pinned floating card not measurable");
  await page.mouse.move(frame.x + frame.width / 2, frame.y + 28);
  await page.mouse.down();
  await page.mouse.move(190, 825, { steps: 12 });
  await page.mouse.up();

  const drawer = page.getByTestId("pinned-media-drawer");
  const pinned = drawer.locator(".pinned-media-drawer-item--pinned");
  await expect(card).toHaveCount(0);
  await expect(pinned).toHaveCount(1);
  await pinned.hover();
  await page.mouse.down();
  await page.waitForTimeout(620);

  const remove = drawer.getByRole("button", { name: `Usuń z kolekcji: ${places[0].title}` });
  await expect(remove).toBeVisible();
  const imageBox = await pinned.locator("img").boundingBox();
  const removeBox = await remove.boundingBox();
  if (!imageBox || !removeBox) throw new Error("Cannot measure centered remove control");
  const glyph = await remove.locator("svg").boundingBox();
  if (!glyph) throw new Error("Missing centered red removal cross");
  expect(Math.abs(glyph.x + glyph.width / 2 - (removeBox.x + removeBox.width / 2))).toBeLessThan(1);
  expect(Math.abs(glyph.y + glyph.height / 2 - (removeBox.y + removeBox.height / 2))).toBeLessThan(1);
  await expect(remove).toHaveCSS("color", "rgb(239, 68, 68)");
  expect(Math.abs(removeBox.x + removeBox.width / 2 - (imageBox.x + imageBox.width / 2))).toBeLessThan(4);
  expect(Math.abs(removeBox.y + removeBox.height / 2 - (imageBox.y + imageBox.height / 2))).toBeLessThan(4);

  await page.mouse.up();
  await remove.click();
  await expect(pinned).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-remove")).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-item--recommended")).toHaveCount(2);
  await page.reload();
  await expect(drawer.locator(".pinned-media-drawer-item--pinned")).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-item--recommended")).toHaveCount(2);
});
