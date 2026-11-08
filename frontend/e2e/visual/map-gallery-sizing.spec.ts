import { expect, test, type Page } from "@playwright/test";

import { city, places, rynekCover } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

test.describe.configure({ timeout: 60_000 });

type GalleryMeasurement = {
  coverWidth: number;
  maxWidth: number;
  tileCount: number;
};

function galleryPhoto(placeId: string, index: number) {
  const id = `${placeId}-photo-${String(index + 1).padStart(2, "0")}`;

  return {
    ...rynekCover,
    caption: `Zdjęcie ${index + 1}`,
    id,
    place_id: placeId,
    public_path: `/media/visual/${id}.svg`,
    thumb_path: `/media/visual/${id}-thumb.svg`,
  };
}

function galleryPlace(photoCount: number, idSuffix: string) {
  const id = `visual-gallery-${photoCount}-${idSuffix}`;
  const photos = Array.from({ length: photoCount }, (_, index) => galleryPhoto(id, index));

  return {
    photos,
    place: {
      ...places[0],
      cover_photo: photos[0],
      id,
      memory_count: 0,
      photo_count: photoCount,
      preview_items: photos.map((photo) => ({ ...photo, kind: "photo" as const })),
      slug: id,
      title: `Galeria ${photoCount} zdjęć`,
      weight: 5,
    },
  };
}

async function tileRectangles(page: Page) {
  return page.locator(".photo-gallery-marker span, .photo-gallery-add-marker span").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    }),
  );
}

async function expectGalleryTilesNotToOverlap(page: Page) {
  await expect
    .poll(async () => {
      const rectangles = await tileRectangles(page);
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
    })
    .toEqual([]);
}

async function expectGalleryTilesInsideMapFrame(page: Page) {
  await expect
    .poll(async () =>
      page.locator(".map-frame").evaluate((mapFrame) => {
        const frameRect = mapFrame.getBoundingClientRect();
        const tiles = Array.from(
          document.querySelectorAll(".photo-gallery-marker span, .photo-gallery-add-marker span"),
        );

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
      }),
    )
    .toEqual([]);
}

async function openMeasuredGallery(
  page: Page,
  { height, idSuffix, photoCount, width }: { height: number; idSuffix: string; photoCount: number; width: number },
): Promise<GalleryMeasurement> {
  const { photos, place } = galleryPlace(photoCount, idSuffix);

  await page.unroute(`${API_URL}/api/places/map?city_id=${city.id}`).catch(() => undefined);
  await page.setViewportSize({ height, width });
  await mockSharedApi(page, [place]);
  await page.route(`${API_URL}/api/places/${place.id}/photos`, (route) => route.fulfill({ json: photos }));
  await page.goto("/");
  await clickMapMarker(page, place.title);
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(photoCount);
  await expect(page.locator(".photo-gallery-add-marker")).toHaveCount(1);
  await expectGalleryTilesNotToOverlap(page);
  await expectGalleryTilesInsideMapFrame(page);

  const rectangles = await tileRectangles(page);

  return {
    coverWidth: Math.round(rectangles[0].width),
    maxWidth: Math.round(Math.max(...rectangles.map((rectangle) => rectangle.width))),
    tileCount: rectangles.length,
  };
}

test("expanded gallery scales thumbnails with the available viewport", async ({ page }) => {
  const mobile = await openMeasuredGallery(page, {
    height: 780,
    idSuffix: "mobile",
    photoCount: 30,
    width: 390,
  });
  const laptop = await openMeasuredGallery(page, {
    height: 820,
    idSuffix: "laptop",
    photoCount: 30,
    width: 1280,
  });
  const desktop = await openMeasuredGallery(page, {
    height: 1152,
    idSuffix: "desktop",
    photoCount: 30,
    width: 2048,
  });
  const largeDesktop = await openMeasuredGallery(page, {
    height: 1440,
    idSuffix: "large",
    photoCount: 30,
    width: 2560,
  });

  expect(mobile.tileCount).toBe(31);
  expect(mobile.coverWidth).toBeLessThan(laptop.coverWidth);
  expect(laptop.coverWidth).toBeLessThan(desktop.coverWidth);
  expect(desktop.coverWidth).toBeLessThanOrEqual(largeDesktop.coverWidth);
  expect(largeDesktop.maxWidth).toBeGreaterThan(laptop.maxWidth);
});

test("expanded gallery keeps compact, medium and dense sets proportional", async ({ page }) => {
  const compact = await openMeasuredGallery(page, {
    height: 1152,
    idSuffix: "compact",
    photoCount: 6,
    width: 2048,
  });
  const medium = await openMeasuredGallery(page, {
    height: 1152,
    idSuffix: "medium",
    photoCount: 18,
    width: 2048,
  });
  const dense = await openMeasuredGallery(page, {
    height: 1152,
    idSuffix: "dense",
    photoCount: 42,
    width: 2048,
  });

  expect(compact.tileCount).toBe(7);
  expect(medium.tileCount).toBe(19);
  expect(dense.tileCount).toBe(43);
  expect(compact.coverWidth).toBeGreaterThan(medium.coverWidth);
  expect(medium.coverWidth).toBeGreaterThan(dense.coverWidth);
  // The 42-photo cloud must fit without overlap; a fixed 180px floor is not feasible.
  expect(dense.coverWidth).toBeGreaterThanOrEqual(120);
});
