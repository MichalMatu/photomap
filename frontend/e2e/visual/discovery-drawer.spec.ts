import { expect, test } from "@playwright/test";

import { places } from "../fixtures/visualData";
import { mockSharedApi } from "../support/visualApi";

test("desktop discovery drawer renders map recommendations and opens the existing place gallery", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockSharedApi(page);
  await page.goto("/");

  const drawer = page.getByTestId("pinned-media-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveClass(/is-open/);
  await expect(drawer.locator(".pinned-media-drawer-item--pinned")).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-item--recommended")).toHaveCount(2);
  await expect(drawer).toHaveAttribute("data-stage", "collection");

  // The photo-only sheet is a compact gallery, not a tall empty grab bar or a redundant heading.
  const handle = drawer.locator(".pinned-media-drawer-handle");
  await expect(handle).toHaveCSS("cursor", "grab");
  await expect(handle).toHaveCSS("height", "30px");
  await expect(drawer.locator(".pinned-media-drawer-section-label")).toHaveCount(0);
  const handleArea = await handle.boundingBox();
  const firstImage = await drawer.locator(".pinned-media-drawer-item img").first().boundingBox();
  const sheetArea = await drawer.boundingBox();
  if (!handleArea || !firstImage || !sheetArea) throw new Error("Photo sheet layout is not measurable");
  expect(firstImage.y - sheetArea.y).toBeLessThan(46);
  await handle.focus();
  await expect(handle).toHaveCSS("box-shadow", "none");
  const focusAppearance = await handle.evaluate((element) => ({
    focused: element.matches(":focus-visible"),
    grabberOutline: getComputedStyle(element.querySelector(".pinned-media-drawer-grab-line")!).outlineStyle,
  }));
  if (focusAppearance.focused) expect(focusAppearance.grabberOutline).toBe("solid");

  const bounds = await drawer.boundingBox();
  if (!bounds) throw new Error("Discovery drawer is not measurable");
  expect(bounds.height).toBeGreaterThanOrEqual(300);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(801);
  await expect(page.locator(".place-map")).toHaveClass(/place-map--drawer-open/);
  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 15_000 });
  await page.screenshot({ path: testInfo.outputPath("desktop-discovery-expanded.png"), animations: "disabled" });

  await drawer.getByRole("button", { name: `Pokaż na mapie: ${places[0].title}` }).click();
  await expect(page.locator(".photo-gallery-marker").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desktop-discovery-place-gallery.png"), animations: "disabled" });
});

test("drawer handle follows a slow drag without jumping between predefined heights", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockSharedApi(page);
  await page.goto("/");

  const drawer = page.getByTestId("pinned-media-drawer");
  const handle = drawer.locator(".pinned-media-drawer-handle");
  await expect(drawer).toHaveAttribute("data-stage", "collection");

  // Map loading can cover the grabber and route the pointer to its SVG overlay.
  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 15_000 });

  const before = await drawer.boundingBox();
  const handleBox = await handle.boundingBox();
  if (!before || !handleBox) throw new Error("Drawer handle is missing");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(320);
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 - 42, {
    steps: 9,
  });

  const during = await drawer.boundingBox();
  const map = await page.locator(".place-map").boundingBox();
  const attribution = await page.getByTestId("map-attribution").boundingBox();
  if (!during || !map || !attribution) throw new Error("Resizing elements not measurable");
  expect(during.height).toBeGreaterThan(before.height + 30);
  expect(during.height).toBeLessThan(before.height + 55);
  expect(map.height).toBeLessThan(800 - before.height - 30);
  expect(attribution.y + attribution.height).toBeLessThanOrEqual(during.y - 4);
  await page.mouse.up();

  await expect(drawer).toHaveAttribute("data-stage", "collection");
  await expect.poll(async () => (await drawer.boundingBox())?.height ?? 0).toBeGreaterThan(before.height + 30);
  await handle.click();
  await expect(drawer).toHaveAttribute("data-stage", "discovery");
  await expect
    .poll(() =>
      page.locator(".map-frame").evaluate((element) => element.style.getPropertyValue("--pinned-drawer-live-height")),
    )
    .toBe("");
});

test("touch-style drawer swipe changes stages and does not open photos", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSharedApi(page);
  await page.goto("/");
  const drawer = page.getByTestId("pinned-media-drawer");
  const handle = drawer.locator(".pinned-media-drawer-handle");

  await handle.dispatchEvent("pointerdown", {
    pointerId: 23,
    pointerType: "touch",
    button: 0,
    clientX: 160,
    clientY: 600,
  });
  await handle.dispatchEvent("pointermove", {
    pointerId: 23,
    pointerType: "touch",
    button: 0,
    clientX: 160,
    clientY: 530,
  });
  await handle.dispatchEvent("pointerup", {
    pointerId: 23,
    pointerType: "touch",
    button: 0,
    clientX: 160,
    clientY: 530,
  });
  await expect(drawer).toHaveAttribute("data-stage", "discovery");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("collapsed thumbnail preview does not bleed through the grabber while expanding", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 15_000 });

  const drawer = page.getByTestId("pinned-media-drawer");
  const handle = drawer.locator(".pinned-media-drawer-handle");
  await page.locator(".place-map").click({ position: { x: 26, y: 240 } });
  await expect(drawer).toHaveAttribute("data-stage", "collapsed");
  await expect.poll(async () => (await drawer.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(719);
  await expect(drawer.locator(".pinned-media-drawer-handle-thumbs img")).toHaveCount(2);

  const start = await handle.boundingBox();
  if (!start) throw new Error("Collapsed grabber is missing");
  await page.mouse.move(start.x + 48, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + 48, start.y + start.height / 2 - 64, { steps: 10 });

  await expect(drawer).toHaveClass(/is-resizing/);
  await expect(drawer.locator(".pinned-media-drawer-handle-thumbs")).toHaveCount(0);
  await expect(drawer.locator(".pinned-media-drawer-grab-line")).toHaveCount(1);
  await expect(handle).toHaveCSS("overflow", "hidden");
  await expect(handle).toHaveCSS(
    "background-color",
    await drawer.evaluate((node) => getComputedStyle(node).backgroundColor),
  );
  await page.mouse.up();

  await expect(drawer).toHaveAttribute("data-stage", "collection");
  await expect(drawer.locator(".pinned-media-drawer-handle-thumbs")).toHaveCount(0);
});

test("discovery size follows its rendered photo rows instead of leaving a giant bottom gap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.getByTestId("map-loading-screen")).toHaveCount(0, { timeout: 15_000 });
  const drawer = page.getByTestId("pinned-media-drawer");
  await drawer.getByRole("button", { name: "Pokaż więcej zdjęć z mapy" }).click();
  await expect(drawer).toHaveAttribute("data-stage", "discovery");
  await expect
    .poll(async () => {
      const box = await drawer.boundingBox();
      const fitted = await page
        .locator(".map-frame")
        .evaluate((frame) =>
          Number.parseFloat((frame as HTMLElement).style.getPropertyValue("--pinned-drawer-fit-height")),
        );
      return Math.abs((box?.height ?? 0) - fitted);
    })
    .toBeLessThan(1);

  const stats = await drawer.evaluate((element) => {
    const content = element.querySelector<HTMLElement>(".pinned-media-drawer-content");
    const frame = element.closest<HTMLElement>(".map-frame");
    if (!content || !frame || !content.lastElementChild) throw new Error("Missing discovery content");
    const lastBottom = content.lastElementChild.getBoundingClientRect().bottom;
    const height = element.getBoundingClientRect().height;
    return {
      height,
      fitted: Number.parseFloat(frame.style.getPropertyValue("--pinned-drawer-fit-height")),
      bottomGap: element.getBoundingClientRect().bottom - lastBottom,
      contentScrolls: content.scrollHeight > content.clientHeight + 2,
      mapHeight: frame.querySelector<HTMLElement>(".place-map")?.getBoundingClientRect().height,
      bottomInset: element.getBoundingClientRect().top,
    };
  });
  expect(stats.fitted).toBeGreaterThan(250);
  expect(Math.abs(stats.height - stats.fitted)).toBeLessThan(2);
  expect(stats.height).toBeLessThan(450);
  expect(stats.bottomGap).toBeLessThan(190);
  expect(Math.abs((stats.mapHeight ?? 0) - stats.bottomInset)).toBeLessThan(2);
  expect(stats.contentScrolls).toBe(false);
});
