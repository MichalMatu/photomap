import type { Page } from "@playwright/test";
import type {
  AdminMemory,
  AdminModerationCounts,
  AdminPhoto,
  AdminPhotoAlbum,
  City,
  PlaceMapItem,
  Report,
} from "../../src/api/types";

import {
  adminGuides,
  adminPlaces,
  appConfig,
  categories,
  city,
  guideDetail,
  guides,
  nadodrzeCover,
  placeDetail,
  places,
  rynekCover,
  rynekMemory,
  rynekSide,
} from "../fixtures/visualData";
import { API_URL } from "./config";

type SharedMapPlace = (typeof places)[number] | PlaceMapItem;
type SharedCity = typeof city | City;
type AdminAlbumPlace = {
  cover_photo_id: string | null;
  id: string;
  title: string;
};

function imageSvg(url: string) {
  const isSecondary = url.includes("nadodrze") || url.includes("side");
  const fill = isSecondary ? "#0a84ff" : "#34c759";
  const accent = isSecondary ? "#ffd60a" : "#0a84ff";
  if (url.includes("portrait")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
      <rect width="360" height="640" fill="${fill}"/>
      <rect x="36" y="52" width="288" height="536" rx="28" fill="${accent}" opacity=".72"/>
      <rect x="78" y="112" width="204" height="360" rx="18" fill="#ffffff" opacity=".28"/>
      <rect x="118" y="486" width="124" height="72" rx="18" fill="#000000" opacity=".18"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" fill="${fill}"/>
    <rect x="44" y="46" width="552" height="328" rx="28" fill="${accent}" opacity=".72"/>
    <rect x="84" y="86" width="220" height="248" rx="18" fill="#ffffff" opacity=".28"/>
    <rect x="336" y="112" width="220" height="188" rx="18" fill="#000000" opacity=".18"/>
  </svg>`;
}

function tileSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#eef3e8"/>
    <path d="M0 80h256M0 176h256M80 0v256M176 0v256" stroke="#d1dcc9" stroke-width="5"/>
    <path d="M-20 220C60 172 114 186 276 124" stroke="#9fb3c8" stroke-width="18" fill="none" opacity=".7"/>
    <path d="M-10 42C72 80 148 82 266 36" stroke="#e2d4a2" stroke-width="10" fill="none" opacity=".9"/>
  </svg>`;
}

function apiListPath(path: string) {
  return (url: URL) => url.href === `${API_URL}${path}` || url.href.startsWith(`${API_URL}${path}?`);
}

function pagedQueueItems<TItem extends { status: string }>(requestUrl: string, items: TItem[]) {
  const url = new URL(requestUrl);
  const status = url.searchParams.get("status");
  const limit = Number(url.searchParams.get("limit") ?? items.length);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const filteredItems = status ? items.filter((item) => item.status === status) : items;
  return filteredItems.slice(offset, offset + limit);
}

function photoMatchesAdminFilters(photo: AdminPhoto, url: URL) {
  const status = url.searchParams.get("status");
  const placeId = url.searchParams.get("place_id");
  const query = url.searchParams.get("query")?.trim().toLocaleLowerCase("pl") ?? "";
  const audio = url.searchParams.get("audio");

  if (status && photo.status !== status) return false;
  if (placeId && photo.place_id !== placeId) return false;
  if (audio === "with-audio" && !photo.admin_audio) return false;
  if (audio === "without-audio" && photo.admin_audio) return false;
  if (!query) return true;

  return [
    photo.caption,
    photo.id,
    photo.attribution_author,
    photo.attribution_license,
    photo.attribution_license_url,
    photo.attribution_source_url,
    photo.description_blocks.map((block) => block.text).join(" "),
  ]
    .filter(Boolean)
    .some((value) => value?.toLocaleLowerCase("pl").includes(query));
}

function filteredAdminPhotos(requestUrl: string, items: AdminPhoto[]) {
  const url = new URL(requestUrl);
  return items.filter((photo) => photoMatchesAdminFilters(photo, url));
}

function adminPhotoAlbums(requestUrl: string, items: AdminPhoto[], placeList: AdminAlbumPlace[]): AdminPhotoAlbum[] {
  const photosByPlaceId = new Map<string, AdminPhoto[]>();
  for (const photo of filteredAdminPhotos(requestUrl, items)) {
    const placePhotos = photosByPlaceId.get(photo.place_id) ?? [];
    placePhotos.push(photo);
    photosByPlaceId.set(photo.place_id, placePhotos);
  }

  return Array.from(photosByPlaceId.entries())
    .map(([placeId, placePhotos]) => {
      const place = placeList.find((item) => item.id === placeId);
      const coverPhoto =
        placePhotos.find((photo) => photo.id === place?.cover_photo_id) ??
        placePhotos.find((photo) => photo.status === "approved") ??
        placePhotos[0];
      return {
        cover_photo: coverPhoto,
        photo_count: placePhotos.length,
        place_id: placeId,
      };
    })
    .sort((firstAlbum, secondAlbum) => {
      const firstPlace = placeList.find((place) => place.id === firstAlbum.place_id);
      const secondPlace = placeList.find((place) => place.id === secondAlbum.place_id);
      return (firstPlace?.title ?? firstAlbum.place_id).localeCompare(secondPlace?.title ?? secondAlbum.place_id, "pl");
    });
}

export async function mockSharedApi(
  page: Page,
  mapPlaces: SharedMapPlace[] = places,
  guideList = guides,
  cityList: SharedCity[] = [city],
  dismissModeratorRecruitment = true,
  dismissMapTour = true,
) {
  if (dismissMapTour) {
    await page.addInitScript(() => {
      window.localStorage.setItem("photomap-public-map-tour-v1-complete", "1");
      window.localStorage.setItem("photomap-public-map-tour-v2-complete", "1");
      window.localStorage.setItem("photomap-public-map-tour-v3-complete", "1");
    });
  }
  if (dismissModeratorRecruitment) {
    await page.addInitScript(() => {
      window.localStorage.setItem("photomap:moderator-recruitment:v1", "dismissed");
    });
  }
  await page.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.fulfill({ body: tileSvg(), contentType: "image/svg+xml" }),
  );
  await page.route(`${API_URL}/media/**`, (route) =>
    route.fulfill({ body: imageSvg(route.request().url()), contentType: "image/svg+xml" }),
  );
  await page.route(apiListPath("/api/places/map"), (route) => {
    const url = new URL(route.request().url());
    const cityId = url.searchParams.get("city_id");
    route.fulfill({ json: cityId ? mapPlaces.filter((place) => place.city_id === cityId) : mapPlaces });
  });
  await page.route(`${API_URL}/api/places/${places[0].slug}`, (route) => route.fulfill({ json: placeDetail }));
  await page.route(`${API_URL}/api/places/${places[0].id}/photos`, (route) => {
    if (new URL(route.request().url()).pathname.endsWith(`/photos/${rynekCover.id}`)) {
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
    route.fulfill({
      json: {
        audio: rynekCover.audio,
        attribution_author: rynekCover.attribution_author,
        attribution_license: rynekCover.attribution_license,
        attribution_license_url: rynekCover.attribution_license_url,
        attribution_source_url: rynekCover.attribution_source_url,
        caption: rynekCover.caption,
        description_blocks: rynekCover.description_blocks,
        id: rynekCover.id,
        place_id: rynekCover.place_id,
        public_path: rynekCover.public_path,
        thumb_path: rynekCover.thumb_path,
      },
    }),
  );
  await page.route(`${API_URL}/api/places/${places[0].id}/memories/${rynekMemory.id}`, (route) =>
    route.fulfill({ json: rynekMemory }),
  );
  await page.route(`${API_URL}/api/categories`, (route) => route.fulfill({ json: categories }));
  await page.route(`${API_URL}/api/cities`, (route) => route.fulfill({ json: cityList }));
  await page.route(`${API_URL}/api/app-config`, (route) => route.fulfill({ json: appConfig }));
  await page.route(`${API_URL}/api/guides`, (route) => route.fulfill({ json: guideList }));
  await page.route(`${API_URL}/api/guides/wizualny-spacer`, (route) => route.fulfill({ json: guideDetail }));
}

type MockAdminApiOptions = {
  adminCategoryList?: typeof categories;
  adminCityList?: Array<typeof city>;
  adminGuideList?: typeof adminGuides;
  adminMemoryList?: AdminMemory[];
  adminModerationCounts?: AdminModerationCounts;
  adminPlaceList?: typeof adminPlaces;
  adminPhotoList?: AdminPhoto[];
  adminReportList?: Report[];
};

function reviewStatusCounts(items: Array<{ status: "approved" | "pending" | "rejected" }>) {
  return {
    all: items.length,
    approved: items.filter((item) => item.status === "approved").length,
    pending: items.filter((item) => item.status === "pending").length,
    rejected: items.filter((item) => item.status === "rejected").length,
  };
}

function reportStatusCounts(items: Array<{ status: "closed" | "open" }>) {
  return {
    all: items.length,
    closed: items.filter((item) => item.status === "closed").length,
    open: items.filter((item) => item.status === "open").length,
  };
}

export async function mockAdminApi(page: Page, options: MockAdminApiOptions = {}) {
  const adminCategoryList = options.adminCategoryList ?? categories;
  const adminCityList = options.adminCityList ?? [city];
  const adminGuideList = options.adminGuideList ?? adminGuides;
  const adminMemoryList = options.adminMemoryList ?? [];
  const adminPlaceList = options.adminPlaceList ?? adminPlaces;
  const adminPhotoList = options.adminPhotoList ?? [rynekCover, rynekSide, nadodrzeCover];
  const adminReportList = options.adminReportList ?? [];
  const adminModerationCounts = options.adminModerationCounts ?? {
    memories: reviewStatusCounts(adminMemoryList),
    photos: reviewStatusCounts(adminPhotoList),
    reports: reportStatusCounts(adminReportList),
  };

  await mockSharedApi(page);
  await page.route(`${API_URL}/api/admin/photos/*/media/*`, (route) =>
    route.fulfill({ body: imageSvg(route.request().url()), contentType: "image/svg+xml" }),
  );
  await page.route(`${API_URL}/api/admin/app-config`, (route) => route.fulfill({ json: appConfig }));
  await page.route(`${API_URL}/api/admin/categories`, (route) => route.fulfill({ json: adminCategoryList }));
  await page.route(`${API_URL}/api/admin/cities`, (route) => route.fulfill({ json: adminCityList }));
  await page.route(`${API_URL}/api/admin/moderation/counts`, (route) => route.fulfill({ json: adminModerationCounts }));
  await page.route(`${API_URL}/api/admin/guides`, (route) => route.fulfill({ json: adminGuideList }));
  await page.route(`${API_URL}/api/admin/guides/*`, (route) => {
    const guideId = route.request().url().split("/").pop();
    const guide = adminGuideList.find((adminGuide) => adminGuide.id === guideId);
    if (!guide) {
      route.fulfill({ json: { detail: "Guide not found" }, status: 404 });
      return;
    }
    route.fulfill({ json: { ...guide, places: guide.preview_places } });
  });
  await page.route(apiListPath("/api/admin/memories"), (route) => {
    route.fulfill({ json: pagedQueueItems(route.request().url(), adminMemoryList) });
  });
  await page.route(`${API_URL}/api/admin/places`, (route) => route.fulfill({ json: adminPlaceList }));
  await page.route(`${API_URL}/api/admin/places/*/photos`, (route) => {
    const [, placeId] =
      route
        .request()
        .url()
        .match(/\/api\/admin\/places\/([^/]+)\/photos/) ?? [];
    const requestUrl = new URL(route.request().url());
    requestUrl.searchParams.set("place_id", placeId);
    route.fulfill({
      json: filteredAdminPhotos(requestUrl.toString(), adminPhotoList),
    });
  });
  await page.route(apiListPath("/api/admin/photos/albums"), (route) => {
    route.fulfill({ json: adminPhotoAlbums(route.request().url(), adminPhotoList, adminPlaceList) });
  });
  await page.route(apiListPath("/api/admin/photos"), (route) => {
    route.fulfill({ json: pagedQueueItems(route.request().url(), adminPhotoList) });
  });
  await page.route(apiListPath("/api/admin/reports"), (route) => {
    route.fulfill({ json: pagedQueueItems(route.request().url(), adminReportList) });
  });
}
