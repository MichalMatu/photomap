import { expect, test } from "@playwright/test";
import { mockSharedApi } from "../support/visualApi";

test("OSM attribution is readable at startup then becomes a tappable info icon", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");

  const attribution = page.getByTestId("map-attribution");
  const credit = attribution.getByRole("link", { name: "© OpenStreetMap" });
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await expect(page.locator(".leaflet-control-attribution")).toHaveCount(0);

  const info = attribution.getByRole("button", { name: "Źródło mapy i licencja OpenStreetMap" });
  await expect(info).toBeVisible({ timeout: 8000 });
  await expect(credit).toHaveCount(0);
  await info.click();
  await expect(credit).toBeVisible();
  await attribution.getByRole("button", { name: "Zwiń informację o źródle mapy" }).click();
  await expect(info).toBeVisible();
});
