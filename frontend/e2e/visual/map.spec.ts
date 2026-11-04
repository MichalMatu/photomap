import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  appConfig,
  city,
  places,
  portraitCover,
  portraitPlace,
  rynekCover,
  rynekMemory,
  rynekSide,
} from "../fixtures/visualData";
import { API_URL, SNAPSHOT_OPTIONS } from "../support/config";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

async function expectTilesNotToOverlap(page: Page, selector: string) {
  await expect.poll(async () => tileOverlaps(page, selector)).toEqual([]);
}

async function tileOverlaps(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) => {
    const rectangles = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
      };
    });
    const overlaps: Array<[number, number]> = [];

    rectangles.forEach((rectangle, index) => {
      rectangles.slice(index + 1).forEach((nextRectangle, offset) => {
        const tolerance = 1;
        const hasOverlap =
          rectangle.left < nextRectangle.right - tolerance &&
          rectangle.right > nextRectangle.left + tolerance &&
          rectangle.top < nextRectangle.bottom - tolerance &&
          rectangle.bottom > nextRectangle.top + tolerance;

        if (hasOverlap) {
          overlaps.push([index, index + offset + 1]);
        }
      });
    });

    return overlaps;
  });
}

async function expectTilesInsideMapFrame(page: Page, selector: string) {
  await expect
    .poll(async () =>
      page.locator(".map-frame").evaluate((mapFrame, tileSelector) => {
        const frameRect = mapFrame.getBoundingClientRect();
        const tiles = Array.from(document.querySelectorAll(tileSelector));

        return tiles
          .map((tile, index) => {
            const rect = tile.getBoundingClientRect();
            const tolerance = 1;
            const isOutside =
              rect.left < frameRect.left - tolerance ||
              rect.right > frameRect.right + tolerance ||
              rect.top < frameRect.top - tolerance ||
              rect.bottom > frameRect.bottom + tolerance;

            return isOutside ? index : null;
          })
          .filter((index) => index !== null);
      }, selector),
    )
    .toEqual([]);
}

async function expectGalleryTilesNotToOverlap(page: Page) {
  await expectTilesNotToOverlap(page, ".photo-gallery-marker span, .photo-gallery-add-marker span");
}

async function expectGalleryTilesInsideMapFrame(page: Page) {
  await expectTilesInsideMapFrame(page, ".photo-gallery-marker span, .photo-gallery-add-marker span");
}

async function expectPlaceTilesNotToOverlap(page: Page) {
  await expectTilesNotToOverlap(page, ".place-photo-marker span");
}

async function placeMarkerCount(page: Page, selector = ".place-photo-marker") {
  return page.locator(selector).count();
}

async function swipePhotoDetailContent(page: Page, direction: "next" | "previous") {
  const content = page.locator(".photo-detail-content");
  const box = await content.boundingBox();
  if (!box) {
    throw new Error("Photo detail content is not visible.");
  }

  const startX = direction === "next" ? box.x + box.width * 0.72 : box.x + box.width * 0.28;
  const endX = direction === "next" ? box.x + box.width * 0.28 : box.x + box.width * 0.72;
  const y = box.y + box.height * 0.52;
  const pointerId = direction === "next" ? 701 : 702;

  await content.dispatchEvent("pointerdown", {
    bubbles: true,
    button: 0,
    buttons: 1,
    cancelable: true,
    clientX: startX,
    clientY: y,
    isPrimary: true,
    pointerId,
    pointerType: "touch",
  });
  await content.dispatchEvent("pointerup", {
    bubbles: true,
    button: 0,
    buttons: 0,
    cancelable: true,
    clientX: endX,
    clientY: y,
    isPrimary: true,
    pointerId,
    pointerType: "touch",
  });
}

function denseCollisionPlaces() {
  return Array.from({ length: 8 }, (_, index) => ({
    ...places[0],
    id: `visual-dense-${index}`,
    lat: places[0].lat + (index % 2) * 0.00004,
    lon: places[0].lon + Math.floor(index / 2) * 0.00004,
    score: 10 - index * 0.2,
    slug: `visual-dense-${index}`,
    title: `Gęste miejsce ${index + 1}`,
    weight: 2.4 - index * 0.1,
  }));
}

function overlappingHitboxPlaces() {
  const sharedPosition = { lat: city.lat, lon: city.lon };
  return [
    {
      ...places[1],
      ...sharedPosition,
      score: 40,
      title: "Panorama Racławicka",
      weight: 5,
    },
    {
      ...places[0],
      ...sharedPosition,
      score: 20,
      title: "Most Tumski",
      weight: 2,
    },
  ];
}

function regionalCity(id: string, name: string, lat: number, lon: number, sortOrder: number) {
  return {
    ...city,
    id,
    lat,
    lon,
    name,
    region: "Dolnośląskie",
    sort_order: sortOrder,
  };
}

function regionalMapData() {
  const regionalCities = [
    city,
    regionalCity("walbrzych", "Wałbrzych", 50.8422, 16.2924, 20),
    regionalCity("karpacz", "Karpacz", 50.7359, 15.7397, 30),
    regionalCity("swidnica", "Świdnica", 50.8431, 16.4877, 40),
    regionalCity("kletno", "Kletno", 50.2347, 16.8439, 50),
  ];
  const wroclawPlaces = Array.from({ length: 36 }, (_, index) => ({
    ...places[0],
    id: `regional-wroclaw-${index}`,
    lat: places[0].lat + (index % 4) * 0.003,
    lon: places[0].lon + Math.floor(index / 4) * 0.003,
    score: 50 - index,
    slug: `regional-wroclaw-${index}`,
    title: `Wrocław ${index + 1}`,
    weight: 5,
  }));
  const cityPlaces = regionalCities.slice(1).map((regionalMapCity) => ({
    ...places[1],
    city: regionalMapCity,
    city_id: regionalMapCity.id,
    id: `regional-${regionalMapCity.id}`,
    lat: regionalMapCity.lat,
    lon: regionalMapCity.lon,
    score: 8,
    slug: `regional-${regionalMapCity.id}`,
    title: regionalMapCity.name,
    weight: 1,
  }));

  return {
    cities: regionalCities,
    places: [...wroclawPlaces, ...cityPlaces],
  };
}

function zoomedViewportPlaces() {
  const zoomedCity = { ...city, default_zoom: 17 };
  const centerPlace = {
    ...places[0],
    city: zoomedCity,
    id: "visual-viewport-center",
    lat: zoomedCity.lat,
    lon: zoomedCity.lon,
    score: 100,
    slug: "visual-viewport-center",
    title: "Widoczne centrum",
    weight: 5,
  };
  const offscreenPlaces = Array.from({ length: 6 }, (_, index) => ({
    ...places[1],
    city: zoomedCity,
    id: `visual-viewport-offscreen-${index}`,
    lat: zoomedCity.lat + 0.08 + index * 0.01,
    lon: zoomedCity.lon + (index % 2 === 0 ? 0.08 : -0.08),
    score: 90 - index,
    slug: `visual-viewport-offscreen-${index}`,
    title: `Poza kadrem ${index + 1}`,
    weight: 4,
  }));

  return {
    places: [centerPlace, ...offscreenPlaces],
    city: zoomedCity,
  };
}

function detailPreloadPhotos(placeId: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const id = `detail-preload-photo-${index + 1}`;

    return {
      ...rynekCover,
      caption: `Zdjęcie do nawigacji ${index + 1}`,
      id,
      place_id: placeId,
      public_path: `/media/visual/${id}.svg`,
      thumb_path: `/media/visual/${id}-thumb.svg`,
    };
  });
}

test("visual: empty desktop map", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, []);
  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await expect(page).toHaveScreenshot("map-empty-desktop.png", SNAPSHOT_OPTIONS);
});

test("map remains visible when app config request fails", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.route(`${API_URL}/api/app-config`, (route) =>
    route.fulfill({
      body: JSON.stringify({ detail: "App config unavailable" }),
      contentType: "application/json",
      status: 500,
    }),
  );
  await page.goto("/");

  await expect(page.locator(".map-frame")).toBeVisible();
  await expect.poll(async () => placeMarkerCount(page)).toBeGreaterThan(0);
  await expect(page.getByText("Nie udało się pobrać mapy")).toHaveCount(0);
});

test("visual: map markers, gallery and photo detail", async ({ page }) => {
  test.setTimeout(60_000);

  const describedCoverDetail = {
    audio: rynekCover.audio,
    attribution_author: rynekCover.attribution_author,
    attribution_license: rynekCover.attribution_license,
    attribution_license_url: rynekCover.attribution_license_url,
    attribution_source_url: rynekCover.attribution_source_url,
    caption: rynekCover.caption,
    description_blocks: [
      {
        type: "paragraph" as const,
        text: "Długi opis zdjęcia Rynku do samodzielnego czytania i TTS.",
      },
    ],
    id: rynekCover.id,
    place_id: rynekCover.place_id,
    public_path: rynekCover.public_path,
    thumb_path: rynekCover.thumb_path,
  };

  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.route(`${API_URL}/api/places/${places[0].id}/photos`, (route) => {
    if (route.request().url().endsWith(`/photos/${rynekCover.id}`)) {
      return route.fallback();
    }
    return route.fulfill({
      json: [
        {
          audio: rynekCover.audio,
          attribution_author: rynekCover.attribution_author,
          attribution_license: rynekCover.attribution_license,
          attribution_license_url: rynekCover.attribution_license_url,
          attribution_source_url: rynekCover.attribution_source_url,
          caption: rynekCover.caption,
          id: rynekCover.id,
          place_id: rynekCover.place_id,
          public_path: rynekCover.public_path,
          thumb_path: rynekCover.thumb_path,
        },
        {
          audio: rynekSide.audio,
          attribution_author: rynekSide.attribution_author,
          attribution_license: rynekSide.attribution_license,
          attribution_license_url: rynekSide.attribution_license_url,
          attribution_source_url: rynekSide.attribution_source_url,
          caption: rynekSide.caption,
          id: rynekSide.id,
          place_id: rynekSide.place_id,
          public_path: rynekSide.public_path,
          thumb_path: rynekSide.thumb_path,
        },
      ],
    });
  });
  await page.route(`${API_URL}/api/places/${places[0].id}/photos/${rynekCover.id}`, (route) =>
    route.fulfill({ json: describedCoverDetail }),
  );
  await page.goto("/");
  await expect(page.locator(".place-photo-marker")).toHaveCount(2);
  await expectPlaceTilesNotToOverlap(page);
  await expect(page).toHaveScreenshot("map-markers-desktop.png", SNAPSHOT_OPTIONS);

  await clickMapMarker(page, places[0].title);
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(3);
  await expectGalleryTilesNotToOverlap(page);
  await expectGalleryTilesInsideMapFrame(page);
  await expect(page).toHaveScreenshot("map-gallery-desktop.png", SNAPSHOT_OPTIONS);

  await clickMapMarker(page, rynekCover.caption);
  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog.getByRole("button", { name: "Pokaż opis zdjęcia" })).toBeVisible();
  await detailDialog.getByRole("button", { name: "Pokaż opis zdjęcia" }).click();
  await expect(detailDialog.locator(".photo-detail-description")).toContainText(
    "Długi opis zdjęcia Rynku do samodzielnego czytania i TTS.",
  );
  const descriptionOverlay = await detailDialog.evaluate((element) => {
    const modalRect = element.getBoundingClientRect();
    const header = element.querySelector(".system-modal-header");
    const description = element.querySelector(".photo-detail-description");
    const descriptionRect = description?.getBoundingClientRect();
    const descriptionStyle = description ? window.getComputedStyle(description) : null;
    const headerStyle = header ? window.getComputedStyle(header) : null;
    return {
      borderTopWidth: descriptionStyle?.borderTopWidth,
      bottomDelta: Math.abs((descriptionRect?.bottom ?? 0) - modalRect.bottom),
      headerZIndex: headerStyle?.zIndex,
      leftDelta: Math.abs((descriptionRect?.left ?? 0) - modalRect.left),
      overlayZIndex: descriptionStyle?.zIndex,
      rightDelta: Math.abs((descriptionRect?.right ?? 0) - modalRect.right),
      topDelta: Math.abs((descriptionRect?.top ?? 0) - modalRect.top),
    };
  });
  expect(descriptionOverlay.borderTopWidth).toBe("0px");
  expect(descriptionOverlay.headerZIndex).toBe("5");
  expect(descriptionOverlay.overlayZIndex).toBe("2");
  expect(descriptionOverlay.leftDelta).toBeLessThanOrEqual(2);
  expect(descriptionOverlay.rightDelta).toBeLessThanOrEqual(2);
  expect(descriptionOverlay.topDelta).toBeLessThanOrEqual(2);
  expect(descriptionOverlay.bottomDelta).toBeLessThanOrEqual(2);
  await expect(
    detailDialog
      .locator(".photo-detail-description p")
      .first()
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          color: style.color,
          fontSize: style.fontSize,
          textShadow: style.textShadow,
        };
      }),
  ).resolves.toEqual({
    color: "rgb(3, 7, 12)",
    fontSize: "15px",
    textShadow: "none",
  });
  await expect(detailDialog.getByRole("button", { name: "Zgłoś problem" })).not.toBeVisible();
  await detailDialog.getByRole("button", { name: "Ukryj opis zdjęcia" }).click();
  await expect(detailDialog.locator(".photo-detail-description")).toHaveCount(0);
  await detailDialog.getByRole("button", { name: "Pokaż informacje" }).click();
  await expect(detailDialog.getByText(rynekCover.caption)).toBeVisible();
  await expect(detailDialog.getByText(places[0].description)).toBeVisible();
  await detailDialog.locator(".photo-detail-image").click({ position: { x: 260, y: 240 } });
  await expect(detailDialog.getByRole("button", { name: "Pokaż informacje" })).toBeVisible();
  await expect(detailDialog.locator(".photo-detail-copy")).not.toBeVisible();
  await expect(page.locator(".map-photo-viewer")).toHaveCount(0);

  const desktopLayout = await detailDialog.evaluate((element) => {
    const dialogRect = element.getBoundingClientRect();
    const imageRect = element.querySelector(".photo-detail-image")?.getBoundingClientRect();
    return {
      dialogHeight: Math.round(dialogRect.height),
      dialogWidth: Math.round(dialogRect.width),
      imageHeight: Math.round(imageRect?.height ?? 0),
      imageWidth: Math.round(imageRect?.width ?? 0),
      internalScroll: element.scrollHeight > element.clientHeight,
      textBlocks: element.querySelectorAll(".photo-detail-text").length,
    };
  });

  expect(desktopLayout.internalScroll).toBe(false);
  expect(desktopLayout.textBlocks).toBe(1);
  expect(desktopLayout.imageWidth).toBeGreaterThanOrEqual(desktopLayout.dialogWidth - 4);
  expect(desktopLayout.imageHeight).toBeGreaterThanOrEqual(desktopLayout.dialogHeight - 4);

  const detailContent = detailDialog.locator(".photo-detail-content");
  await expect(detailDialog.getByRole("button", { name: "Pełny ekran" })).toHaveCount(0);
  await expect(detailDialog.locator(".system-modal-drag-handle")).toHaveCount(0);

  const dialogBeforeDrag = await detailDialog.boundingBox();
  const contentBeforeDrag = await detailContent.boundingBox();
  expect(dialogBeforeDrag).not.toBeNull();
  expect(contentBeforeDrag).not.toBeNull();
  await page.mouse.move(
    contentBeforeDrag!.x + contentBeforeDrag!.width / 2,
    contentBeforeDrag!.y + Math.min(140, contentBeforeDrag!.height / 3),
  );
  await page.mouse.down();
  await page.mouse.move(
    contentBeforeDrag!.x + contentBeforeDrag!.width / 2 - 14,
    contentBeforeDrag!.y + Math.min(140, contentBeforeDrag!.height / 3) + 10,
    { steps: 4 },
  );
  await page.mouse.up();
  const dialogAfterDrag = await detailDialog.boundingBox();
  expect(dialogAfterDrag).not.toBeNull();
  expect(
    Math.abs(dialogAfterDrag!.x - dialogBeforeDrag!.x) + Math.abs(dialogAfterDrag!.y - dialogBeforeDrag!.y),
  ).toBeGreaterThan(5);

  await detailContent.dblclick({ position: { x: 32, y: 160 } });
  await expect
    .poll(async () => page.evaluate(() => Boolean(document.fullscreenElement?.classList.contains("system-modal"))))
    .toBe(true);
  await expect(detailDialog).toHaveClass(/system-modal--fullscreen/);

  const fullscreenLayout = await detailDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
    };
  });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(fullscreenLayout.left).toBe(0);
  expect(fullscreenLayout.top).toBe(0);
  expect(fullscreenLayout.width).toBeGreaterThanOrEqual(viewport!.width - 2);
  expect(fullscreenLayout.height).toBeGreaterThanOrEqual(viewport!.height - 2);

  await detailContent.dblclick({ position: { x: 32, y: 160 } });
  await expect.poll(async () => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(detailDialog).not.toHaveClass(/system-modal--fullscreen/);
  await expect(detailDialog.getByRole("button", { name: "Pełny ekran" })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(detailDialog).toBeHidden();
  await clickMapMarker(page, rynekMemory.caption);
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole("button", { name: "Pokaż informacje" }).click();
  await expect(detailDialog.getByText(rynekMemory.caption)).toBeVisible();
  await expect(detailDialog.getByText(rynekMemory.memory_text)).toBeVisible();
  await expect(detailDialog.getByText(`${rynekMemory.author_name}, ${rynekMemory.author_city}`)).toBeVisible();
});

test("visual: dense local map markers are resolved without overlap", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  const densePlaces = denseCollisionPlaces();
  await mockSharedApi(page, densePlaces);
  await page.goto("/");

  await expect.poll(async () => placeMarkerCount(page)).toBeGreaterThan(0);
  const visibleMarkerCount = await placeMarkerCount(page);
  expect(visibleMarkerCount).toBeLessThanOrEqual(densePlaces.length);
  await expectPlaceTilesNotToOverlap(page);
});

test("place marker hit area follows the visible displaced tile", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, overlappingHitboxPlaces());
  await page.goto("/");

  await expect(page.locator(".place-photo-marker")).toHaveCount(2);
  await expectPlaceTilesNotToOverlap(page);

  const target = await page.locator('[title="Most Tumski"] span').evaluate((element) => {
    const blocker = document.querySelector('[title="Panorama Racławicka"]');
    const blockerSpan = blocker?.querySelector("span");
    if (!blocker || !blockerSpan) {
      throw new Error("Expected the blocking marker to be rendered.");
    }

    const blockerRect = blocker.getBoundingClientRect();
    const blockerSpanRect = blockerSpan.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const clickPoint = {
      x: blockerRect.left + blockerRect.width / 2,
      y: blockerRect.bottom - 4,
    };
    const deltaX = clickPoint.x - (targetRect.left + targetRect.width / 2);
    const deltaY = clickPoint.y - (targetRect.top + targetRect.height / 2);

    element.style.translate = `${deltaX}px ${deltaY}px`;

    return {
      clickPoint,
      isClickPointInsideBlockerMarker:
        clickPoint.x >= blockerRect.left &&
        clickPoint.x <= blockerRect.right &&
        clickPoint.y >= blockerRect.top &&
        clickPoint.y <= blockerRect.bottom,
      isClickPointInsideBlockerSpan:
        clickPoint.x >= blockerSpanRect.left &&
        clickPoint.x <= blockerSpanRect.right &&
        clickPoint.y >= blockerSpanRect.top &&
        clickPoint.y <= blockerSpanRect.bottom,
    };
  });

  expect(target.isClickPointInsideBlockerMarker).toBe(true);
  expect(target.isClickPointInsideBlockerSpan).toBe(false);

  await page.mouse.click(target.clickPoint.x, target.clickPoint.y);

  await expect(page.locator('.place-photo-marker.is-selected[title="Most Tumski"]')).toHaveCount(1);
  await expect(page.locator('.place-photo-marker.is-selected[title="Panorama Racławicka"]')).toHaveCount(0);
});

test("multi-city map shows regional places without a public city filter", async ({ page }) => {
  const regionalData = regionalMapData();
  const wroclawMarkerSelector = '.place-photo-marker[title^="Wrocław"]';
  const mapRequests: string[] = [];
  const cityRequests: string[] = [];

  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, regionalData.places, undefined, regionalData.cities);
  await page.route(`${API_URL}/api/app-config`, (route) =>
    route.fulfill({
      json: {
        ...appConfig,
        map: {
          ...appConfig.map,
          fallback_center: { lat: 50.97, lon: 16.66 },
          fallback_zoom: 8,
        },
      },
    }),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.href.startsWith(`${API_URL}/api/places/map`)) {
      mapRequests.push(url.searchParams.get("city_id") ?? "all");
    }
    if (url.href === `${API_URL}/api/cities`) {
      cityRequests.push(url.href);
    }
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Pokaż pasek nawigacji" }).click();
  await expect(page.getByRole("button", { name: /Zmień filtr miasta mapy/ })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Wybierz miasto" })).toHaveCount(0);
  await expect.poll(async () => placeMarkerCount(page, wroclawMarkerSelector)).toBeGreaterThan(0);
  await expect(page.locator('.place-photo-marker[title="Wałbrzych"]')).toHaveCount(1);
  await expectPlaceTilesNotToOverlap(page);
  expect([...new Set(mapRequests)]).toEqual(["all"]);
  expect(cityRequests).toEqual([]);
});

test("photo gallery backdrop blocks clicks on place tiles underneath", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker")).toHaveCount(2);

  await clickMapMarker(page, places[0].title);
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(3);

  const coveredMarkerBox = await page.locator(`[title="${places[1].title}"]`).first().boundingBox();
  expect(coveredMarkerBox).not.toBeNull();

  await page.mouse.click(
    coveredMarkerBox!.x + coveredMarkerBox!.width / 2,
    coveredMarkerBox!.y + coveredMarkerBox!.height / 2,
  );

  await expect(page.locator(".photo-gallery-marker")).toHaveCount(0);
  await expect(page.locator(".place-photo-marker.is-selected")).toHaveCount(0);
});

test("photo gallery keeps tiles mounted when opening a photo detail", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker")).toHaveCount(2);

  const photoListRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url() === `${API_URL}/api/places/${places[0].id}/photos`) {
      photoListRequests.push(request.url());
    }
  });

  const photosResponse = page.waitForResponse(`${API_URL}/api/places/${places[0].id}/photos`);
  await page.locator(`[title="${places[0].title}"] span`).click();
  await photosResponse;
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(3);
  expect(photoListRequests).toHaveLength(1);

  const coverTile = page.locator(`[title="${rynekCover.caption}"] span`);
  await coverTile.evaluate((element) => {
    element.setAttribute("data-gallery-probe", "stable");
  });
  await coverTile.click();

  await expect(page.getByRole("dialog", { name: places[0].title })).toBeVisible();
  expect(photoListRequests).toHaveLength(1);
  await expect(page.locator('.photo-gallery-marker span[data-gallery-probe="stable"]')).toHaveCount(1);
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(3);
});

test("photo detail preloads only neighboring full-size photos", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  const placeId = "visual-detail-preload-place";
  const photos = detailPreloadPhotos(placeId, 6);
  const place = {
    ...places[0],
    cover_photo: photos[0],
    id: placeId,
    memory_count: 0,
    photo_count: photos.length,
    preview_items: photos.slice(0, 2).map((photo) => ({ ...photo, kind: "photo" as const })),
    slug: placeId,
    title: "Galeria kontrolowana",
  };
  const fullImageRequests: string[] = [];

  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.includes("/media/visual/detail-preload-photo-") && !pathname.includes("-thumb")) {
      fullImageRequests.push(pathname);
    }
  });

  await mockSharedApi(page, [place]);
  await page.route(`${API_URL}/api/places/${place.id}/photos`, (route) => route.fulfill({ json: photos }));
  await page.goto("/");
  const photosResponse = page.waitForResponse(`${API_URL}/api/places/${place.id}/photos`);
  await clickMapMarker(page, place.title);
  await photosResponse;
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(6);
  expect(fullImageRequests).toEqual([]);

  await clickMapMarker(page, photos[0].caption);
  await expect(page.getByRole("dialog", { name: place.title })).toBeVisible();
  await page.waitForTimeout(1_600);

  expect([...new Set(fullImageRequests)].sort()).toEqual(
    [photos[0].public_path, photos[1].public_path, photos[5].public_path].sort(),
  );
});

test("photo detail swipe navigates photos in mobile, landscape and fullscreen", async ({ page }) => {
  await page.setViewportSize({ height: 780, width: 390 });
  await mockSharedApi(page);
  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekCover.caption);

  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  const detailImage = detailDialog.locator(".photo-detail-image");
  await expect(detailDialog).toBeVisible();
  await expect(detailImage).toHaveAttribute("alt", rynekCover.caption ?? "");
  const mobileNavMetrics = await detailDialog.locator(".photo-detail-nav-button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
      };
    }),
  );
  expect(mobileNavMetrics).toHaveLength(2);
  for (const metric of mobileNavMetrics) {
    expect(Math.abs(metric.width - metric.height)).toBeLessThanOrEqual(1);
    expect(metric.width).toBeGreaterThanOrEqual(33);
    expect(metric.width).toBeLessThanOrEqual(35);
  }

  await swipePhotoDetailContent(page, "next");
  await expect(detailImage).toHaveAttribute("alt", rynekSide.caption ?? "");
  await swipePhotoDetailContent(page, "previous");
  await expect(detailImage).toHaveAttribute("alt", rynekCover.caption ?? "");

  await page.setViewportSize({ height: 390, width: 780 });
  await swipePhotoDetailContent(page, "next");
  await expect(detailImage).toHaveAttribute("alt", rynekSide.caption ?? "");

  await detailImage.dblclick();
  await expect
    .poll(async () => page.evaluate(() => Boolean(document.fullscreenElement?.classList.contains("system-modal"))))
    .toBe(true);
  await swipePhotoDetailContent(page, "previous");
  await expect(detailImage).toHaveAttribute("alt", rynekCover.caption ?? "");
});

test("visual: far zoom keeps one representative for a city even when the viewport has room", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, denseCollisionPlaces());
  await page.route(`${API_URL}/api/app-config`, (route) =>
    route.fulfill({
      json: {
        ...appConfig,
        map: {
          ...appConfig.map,
          fallback_zoom: 8,
        },
      },
    }),
  );
  await page.goto("/");

  await expect(page.locator(".place-photo-marker")).toHaveCount(1);
  await expect(page.locator('[title="Gęste miejsce 1"]')).toHaveCount(1);
  await expectPlaceTilesNotToOverlap(page);
});

test("visual: zoomed map does not push offscreen place markers to the edges", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  const viewportData = zoomedViewportPlaces();
  await mockSharedApi(page, viewportData.places);
  await page.goto("/");

  await expect(page.locator(".place-photo-marker")).toHaveCount(1);
  await expect(page.locator('[title="Widoczne centrum"]')).toHaveCount(1);
  await expect(page.locator('.place-photo-marker[title^="Poza kadrem"]')).toHaveCount(0);
});

test("visual: mobile photo detail fills the modal without internal scrolling", async ({ page }) => {
  await page.setViewportSize({ height: 780, width: 390 });
  await mockSharedApi(page);
  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekCover.caption);

  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  await expect(detailDialog).toBeVisible();
  const mobileLayout = await detailDialog.evaluate((element) => {
    const dialogRect = element.getBoundingClientRect();
    const imageRect = element.querySelector(".photo-detail-image")?.getBoundingClientRect();
    const image = element.querySelector(".photo-detail-image");
    const actionBoxes = Array.from(
      element.querySelectorAll(
        ".system-modal-header-actions > .system-modal-icon-action, .system-modal-header-actions > .system-modal-drag-handle, .system-modal-header-actions > .system-modal-close",
      ),
    ).map((action) => action.getBoundingClientRect());
    return {
      dialogHeight: Math.round(dialogRect.height),
      dialogWidth: Math.round(dialogRect.width),
      imageHeight: Math.round(imageRect?.height ?? 0),
      imageWidth: Math.round(imageRect?.width ?? 0),
      internalScroll: element.scrollHeight > element.clientHeight,
      objectFit: image ? window.getComputedStyle(image).objectFit : null,
      actionHeights: actionBoxes.map((box) => Math.round(box.height)),
      actionTops: actionBoxes.map((box) => Math.round(box.top)),
    };
  });

  expect(mobileLayout.dialogHeight).toBeGreaterThan(400);
  expect(mobileLayout.internalScroll).toBe(false);
  expect(mobileLayout.imageWidth).toBeGreaterThanOrEqual(mobileLayout.dialogWidth - 4);
  expect(mobileLayout.imageHeight).toBeGreaterThanOrEqual(mobileLayout.dialogHeight - 4);
  expect(mobileLayout.objectFit).toBe("cover");
  for (const actionHeight of mobileLayout.actionHeights) {
    expect(actionHeight).toBeGreaterThanOrEqual(35);
    expect(actionHeight).toBeLessThanOrEqual(36);
  }
  expect(Math.max(...mobileLayout.actionTops) - Math.min(...mobileLayout.actionTops)).toBeLessThanOrEqual(1);
});

test("pinned media card exposes keyboard map link and keeps image drag/double-click", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await page.addInitScript(() => window.localStorage.removeItem("photomap:pinned-media-board:v1"));
  await mockSharedApi(page);
  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekCover.caption);

  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole("button", { name: "Przypnij zdjęcie" }).click();
  await expect(detailDialog).toBeHidden();

  const card = page.getByTestId("pinned-media-card");
  const imageWrap = card.locator(".pinned-media-card-image-wrap");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("pinned-media-map-link")).toHaveCount(0);
  const mapLinkButton = card.getByRole("button", { name: /Pokaż miejsce na mapie/ });
  await expect(mapLinkButton).toHaveAttribute("aria-pressed", "false");
  await mapLinkButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pinned-media-map-link")).toHaveCount(1);
  const hideMapLinkButton = card.getByRole("button", { name: /Ukryj połączenie z mapą/ });
  await expect(hideMapLinkButton).toHaveAttribute("aria-pressed", "true");
  await hideMapLinkButton.focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("pinned-media-map-link")).toHaveCount(0);

  const initialCardBox = await card.boundingBox();
  const imageBox = await imageWrap.boundingBox();
  expect(initialCardBox).not.toBeNull();
  expect(imageBox).not.toBeNull();

  const imageCenter = {
    x: imageBox!.x + imageBox!.width / 2,
    y: imageBox!.y + imageBox!.height / 2,
  };
  await page.mouse.move(imageCenter.x, imageCenter.y);
  await page.mouse.down();
  await page.mouse.move(imageCenter.x - 140, imageCenter.y + 80, { steps: 6 });
  await page.mouse.up();

  await expect
    .poll(async () => {
      const draggedBox = await card.boundingBox();
      return draggedBox ? Math.round(initialCardBox!.x - draggedBox.x) : 0;
    })
    .toBeGreaterThan(40);

  const draggedImageBox = await imageWrap.boundingBox();
  expect(draggedImageBox).not.toBeNull();
  await page.mouse.dblclick(
    draggedImageBox!.x + draggedImageBox!.width / 2,
    draggedImageBox!.y + draggedImageBox!.height / 2,
  );
  await expect(page.getByTestId("pinned-media-map-link")).toHaveCount(1);

  await page.mouse.dblclick(
    draggedImageBox!.x + draggedImageBox!.width / 2,
    draggedImageBox!.y + draggedImageBox!.height / 2,
  );
  await expect(page.getByTestId("pinned-media-map-link")).toHaveCount(0);
});

test("pinned media cards keep equal frame bottoms with different copy lengths", async ({ page }) => {
  await page.setViewportSize({ height: 620, width: 1000 });
  await page.addInitScript(
    ({ firstPlace, firstPhoto, secondPlace, secondPhoto }) => {
      const imageHeight = 180;
      const aspectRatio = 640 / 420;
      const cardWidth = Math.round(imageHeight * aspectRatio);
      window.localStorage.setItem(
        "photomap:pinned-media-board:v1",
        JSON.stringify({
          cards: [
            {
              createdAt: 1_000,
              id: `${firstPlace.id}:photo:${firstPhoto.id}`,
              itemId: firstPhoto.id,
              kind: "photo",
              layout: {
                aspectRatio,
                height: imageHeight,
                width: cardWidth,
                x: 120,
                y: 84,
                zIndex: 1,
              },
              placeId: firstPlace.id,
            },
            {
              createdAt: 1_001,
              id: `${secondPlace.id}:photo:${secondPhoto.id}`,
              itemId: secondPhoto.id,
              kind: "photo",
              layout: {
                aspectRatio,
                height: imageHeight,
                width: cardWidth,
                x: 420,
                y: 84,
                zIndex: 2,
              },
              placeId: secondPlace.id,
            },
          ],
          version: 1,
        }),
      );
    },
    {
      firstPhoto: rynekCover,
      firstPlace: places[0],
      secondPhoto: places[1].cover_photo,
      secondPlace: places[1],
    },
  );
  await mockSharedApi(page);
  await page.goto("/");

  const cards = page.getByTestId("pinned-media-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText(places[0].title);
  await expect(cards.nth(1)).toContainText(places[1].title);

  const metrics = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const frame = element.getBoundingClientRect();
      const copy = element.querySelector(".pinned-media-card-copy")?.getBoundingClientRect();
      const image = element.querySelector(".pinned-media-card-image-wrap")?.getBoundingClientRect();
      return {
        bottom: Math.round(frame.bottom),
        copyHeight: Math.round(copy?.height ?? 0),
        imageHeight: Math.round(image?.height ?? 0),
      };
    }),
  );

  expect(metrics[0].copyHeight).toBe(72);
  expect(metrics[1].copyHeight).toBe(72);
  expect(metrics[0].bottom).toBe(metrics[1].bottom);
  expect(metrics[0].imageHeight).toBe(metrics[1].imageHeight);
  expect(metrics[0].imageHeight).toBeGreaterThanOrEqual(176);
});

test("pinned media portrait cards can shrink to the tile minimum", async ({ page }) => {
  await page.setViewportSize({ height: 620, width: 1000 });
  await page.addInitScript(
    ({ place, photo }) => {
      window.localStorage.setItem(
        "photomap:pinned-media-board:v1",
        JSON.stringify({
          cards: [
            {
              createdAt: 1_000,
              id: `${place.id}:photo:${photo.id}`,
              itemId: photo.id,
              kind: "photo",
              layout: {
                aspectRatio: 0.56,
                height: 320,
                width: 120,
                x: 160,
                y: 96,
                zIndex: 1,
              },
              placeId: place.id,
            },
          ],
          version: 1,
        }),
      );
    },
    { photo: portraitCover, place: portraitPlace },
  );
  await mockSharedApi(page, [portraitPlace]);
  await page.goto("/");

  const card = page.getByTestId("pinned-media-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(portraitPlace.title);

  const metrics = await card.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const copy = element.querySelector(".pinned-media-card-copy")?.getBoundingClientRect();
    const image = element.querySelector(".pinned-media-card-image-wrap")?.getBoundingClientRect();
    return {
      copyHeight: Math.round(copy?.height ?? 0),
      frameHeight: Math.round(frame.height),
      imageHeight: Math.round(image?.height ?? 0),
      imageWidth: Math.round(image?.width ?? 0),
    };
  });

  expect(metrics.copyHeight).toBe(72);
  expect(Math.abs(metrics.imageHeight - metrics.imageWidth)).toBeLessThanOrEqual(2);
  expect(metrics.imageWidth).toBeGreaterThanOrEqual(176);
  expect(metrics.frameHeight).toBeLessThanOrEqual(254);
});

test("visual: mobile memory sheet", async ({ page }) => {
  await page.setViewportSize({ height: 780, width: 390 });
  await mockSharedApi(page);
  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, `Byłem tutaj: ${places[0].title}`);
  await expect(page.getByRole("dialog", { name: "Byłem tutaj" })).toBeVisible();
  await expect(page).toHaveScreenshot("memory-sheet-mobile.png", SNAPSHOT_OPTIONS);
});
