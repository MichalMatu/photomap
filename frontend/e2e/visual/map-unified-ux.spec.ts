import { expect, test } from "@playwright/test";
import { mockSharedApi } from "../support/visualApi";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 844, height: 390 },
]) {
  test(`drawer preserves map space and opens predictably at ${viewport.width}×${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockSharedApi(page);
    await page.goto("/");
    const drawer = page.getByTestId("pinned-media-drawer");
    await expect(drawer).toHaveAttribute("data-stage", "collapsed");
    const map = page.locator(".place-map");
    await expect.poll(() => map.evaluate((el) => Math.round(el.getBoundingClientRect().height))).toBe(viewport.height);

    await drawer.getByRole("button", { name: "Rozwiń szufladę zdjęć" }).click();
    await expect(drawer).toHaveAttribute("data-stage", "collection");
    await expect
      .poll(() => map.evaluate((el) => Math.round(el.getBoundingClientRect().height)))
      .toBeLessThan(viewport.height - 100);
    // Wait for the drawer transition before comparing the final layout geometry.
    await expect
      .poll(async () => {
        const mapBox = await map.boundingBox();
        const drawerBox = await drawer.boundingBox();
        if (!mapBox || !drawerBox) return 999;
        return Math.abs(mapBox.y + mapBox.height - drawerBox.y);
      })
      .toBeLessThan(8);

    await drawer.getByRole("button", { name: "Więcej zdjęć" }).click();
    await expect(drawer).toHaveAttribute("data-stage", "discovery");
    await drawer.getByRole("button", { name: "Mniej zdjęć" }).click();
    await expect(drawer).toHaveAttribute("data-stage", "collection");
    await drawer.getByRole("button", { name: "Zwiń szufladę zdjęć" }).click();
    await expect(drawer).toHaveAttribute("data-stage", "collapsed");
    await expect.poll(() => map.evaluate((el) => Math.round(el.getBoundingClientRect().height))).toBe(viewport.height);
    await page.screenshot({ path: testInfo.outputPath(`unified-ux-${viewport.width}.png`), animations: "disabled" });
  });
}

test("filters, display options and navigation have independent actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Otwórz menu" }).click();
  await expect(page.getByRole("navigation", { name: "Nawigacja PhotoMap" })).toBeVisible();
  await expect(page.locator("#app-side-drawer .map-tools-option")).toHaveCount(0);
  await page.getByRole("button", { name: "Zamknij menu" }).click();

  await page.getByRole("button", { name: "Filtry mapy" }).click();
  const filters = page.locator("#map-tools-panel");
  await expect(filters).toBeVisible();
  await expect(filters).toContainText("Kategorie miejsc");
  const firstCategory = filters.locator(".map-tools-options--categories button").first();
  await expect(firstCategory).toBeVisible();
  await firstCategory.click();
  await expect(firstCategory).toHaveAttribute("aria-pressed", "true");
  await filters.getByRole("button", { name: "Wyczyść" }).click();
  await expect(firstCategory).toHaveAttribute("aria-pressed", "false");
  const featured = filters.getByRole("button", { name: "Polecane" });
  await featured.click();
  await expect(featured).toHaveAttribute("aria-pressed", "true");
  await filters.getByRole("button", { name: "Wyczyść" }).click();
  await expect(filters.getByRole("button", { name: "Wszystkie" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Ustawienia widoku mapy" }).click();
  const display = page.locator("#map-tools-panel");
  await expect(display).toContainText("Miejsca na mapie");
  await expect(display).not.toContainText("Kategorie miejsc");
  await display.getByRole("button", { name: "Pinezki" }).click();
  await expect(display.getByRole("button", { name: "Pinezki" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".place-map-pin-marker").first()).toBeVisible();
  await display.getByRole("button", { name: "Miniatury" }).click();
  await expect(display.getByRole("button", { name: "Miniatury" })).toHaveAttribute("aria-pressed", "true");
  await display.getByRole("button", { name: "Pokaż szufladę zdjęć" }).click();
  await expect(page.getByTestId("pinned-media-drawer")).toHaveCount(0);
  await display.getByRole("button", { name: "Pokaż szufladę zdjęć" }).click();
  await expect(page.getByTestId("pinned-media-drawer")).toBeVisible();
});
