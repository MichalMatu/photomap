import { expect, test } from "@playwright/test";
import { mockSharedApi } from "../support/visualApi";

test("OSM attribution stays readable without an info icon or obstructing map controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");

  const attribution = page.getByTestId("map-attribution");
  const credit = attribution.getByRole("link", { name: "© OpenStreetMap" });
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await expect(page.locator(".leaflet-control-attribution")).toHaveCount(0);
  await expect(attribution.getByRole("button")).toHaveCount(0);

  await page.waitForTimeout(5500);
  await expect(credit).toBeVisible();
  await credit.click();
  await expect(credit).toBeVisible();
});
