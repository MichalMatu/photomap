import { expect, test } from "@playwright/test";

import { places, rynekCover, rynekSide } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

const STORAGE_KEY = "photomap:pinned-media-board:v1";

test("pinned full-gallery photo survives reload when it is absent from map preview data", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);

  const hiddenPhoto = {
    audio: rynekSide.audio,
    attribution_author: rynekSide.attribution_author,
    attribution_license: rynekSide.attribution_license,
    attribution_license_url: rynekSide.attribution_license_url,
    attribution_source_url: rynekSide.attribution_source_url,
    caption: "Zdjęcie spoza podglądu mapy",
    description_blocks: [],
    id: "visual-hidden-full-gallery-photo",
    place_id: places[0].id,
    public_path: "/media/visual/hidden-full-gallery-photo.svg",
    thumb_path: "/media/visual/hidden-full-gallery-photo-thumb.svg",
  };

  await page.route(`${API_URL}/api/places/${places[0].id}/photos`, (route) =>
    route.fulfill({
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
        hiddenPhoto,
      ],
    }),
  );
  await page.route(`${API_URL}/api/places/${places[0].id}/photos/${hiddenPhoto.id}`, (route) =>
    route.fulfill({ json: hiddenPhoto }),
  );

  await page.goto("/");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), STORAGE_KEY);
  await page.reload();
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, hiddenPhoto.caption);

  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole("button", { name: "Przypnij zdjęcie" }).click();

  const card = page.getByTestId("pinned-media-card");
  await expect(card).toContainText(hiddenPhoto.caption);
  await expect
    .poll(() => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), STORAGE_KEY))
    .toContain(hiddenPhoto.id);

  await page.reload();

  const restoredCard = page.getByTestId("pinned-media-card");
  await expect(restoredCard).toBeVisible();
  await expect(restoredCard).toContainText(hiddenPhoto.caption);
  await expect(restoredCard.locator("img")).toHaveAttribute("alt", hiddenPhoto.caption);
  await restoredCard.click({ position: { x: 60, y: 65 } });
  await expect(page.getByRole("dialog", { name: places[0].title })).toBeVisible();
  await expect(page.getByRole("dialog", { name: places[0].title })).toContainText(hiddenPhoto.caption);
});

// Persisted full-gallery media must remain openable from the same fan detail viewer after reload.
