import { expect, test } from "@playwright/test";
import { mockSharedApi } from "../support/visualApi";
test("two-way mobile menu swipes and concise rail retain settings", async ({ page }) => {
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
  await expect(page.locator(".side-rail")).not.toHaveClass(/is-open/);
  await swipe(45, 180, 320, 560);
  await expect(page.locator(".side-rail")).not.toHaveClass(/is-open/);
  await swipe(46, 160);
  await expect(page.locator(".side-rail")).toHaveClass(/is-open/);
  await expect
    .poll(() => page.evaluate(() => Boolean(document.elementFromPoint(60, 370)?.closest(".side-rail"))))
    .toBe(true);
  await expect(page.getByRole("button", { name: "Otwórz warstwy mapy" })).toHaveCount(1);
  await expect(page.locator(".rail-category-nav")).toHaveCount(0);
  await swipe(60, 190);
  await expect(page.locator(".side-drawer")).toHaveClass(/is-open/);
  await expect
    .poll(() => page.evaluate(() => Boolean(document.elementFromPoint(175, 370)?.closest(".side-drawer"))))
    .toBe(true);
  await expect(page.getByRole("navigation", { name: "Widok mapy" })).toBeVisible();
  await swipe(175, 48);
  await expect(page.locator(".side-drawer")).not.toHaveClass(/is-open/);
  await expect(page.locator(".side-rail")).toHaveClass(/is-open/);
  await expect
    .poll(() => page.evaluate(() => Boolean(document.elementFromPoint(60, 370)?.closest(".side-rail"))))
    .toBe(true);
  await swipe(60, 5);
  await expect(page.locator(".side-rail")).not.toHaveClass(/is-open/);
  await page.getByRole("button", { name: "Pokaż pasek nawigacji" }).click();
  await page.getByRole("button", { name: "Otwórz warstwy mapy" }).click();
  await expect(page.locator(".side-drawer")).toHaveClass(/is-open/);
});
