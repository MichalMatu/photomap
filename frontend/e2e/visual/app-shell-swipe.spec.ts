import { expect, test } from "@playwright/test";
import { mockSharedApi } from "../support/visualApi";

test("mobile menu opens in one gesture and closes without intercepting map pan", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");

  const swipe = async (x: number, to: number, y = 370, endY = 373) =>
    page.evaluate(
      ({ x, to, y, endY }) => {
        const el = document.elementFromPoint(x, y) ?? document;
        const opts = { pointerId: 79, pointerType: "touch", isPrimary: true, bubbles: true };
        el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x, clientY: y }));
        document.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: to, clientY: endY }));
      },
      { x, to, y, endY },
    );

  await swipe(160, 350);
  await expect(page.locator(".side-drawer")).not.toHaveClass(/is-open/);
  await swipe(46, 160, 320, 560);
  await expect(page.locator(".side-drawer")).not.toHaveClass(/is-open/);
  await swipe(46, 160);
  await expect(page.locator(".side-drawer")).toHaveClass(/is-open/);
  await expect(page.getByRole("navigation", { name: "Nawigacja PhotoMap" })).toBeVisible();
  await expect(page.locator("#app-side-drawer .drawer-section--layers")).toHaveCount(0);
  await swipe(175, 48);
  await expect(page.locator(".side-drawer")).not.toHaveClass(/is-open/);
  await page.getByRole("button", { name: "Otwórz menu" }).click();
  await expect(page.locator(".side-drawer")).toHaveClass(/is-open/);
  await page.getByRole("button", { name: "Zamknij menu" }).click();
  await expect(page.locator(".side-drawer")).not.toHaveClass(/is-open/);
});
