import { describe, expect, it } from "vitest";

import type { Category, PlaceMapItem } from "../../api/types";
import {
  filterMapPlacesByCategories,
  getMapCategoryFilterItems,
  isSupportedMapCategoryIcon,
  toggleMapCategoryFilter,
} from "./mapCategoryFilters";

function category(overrides: Partial<Category> & Pick<Category, "id">): Category {
  return {
    description: null,
    icon: "coffee",
    label: overrides.id,
    sort_order: 0,
    status: "active",
    ...overrides,
  };
}

function place({ id, ...overrides }: Partial<PlaceMapItem> & Pick<PlaceMapItem, "id">): PlaceMapItem {
  return {
    category_ids: [],
    categories: [],
    city: {
      default_zoom: 13,
      id: "wroclaw",
      lat: 51.1079,
      lon: 17.0385,
      name: "Wrocław",
      region: "Dolnośląskie",
      sort_order: 10,
      status: "active",
    },
    city_id: "wroclaw",
    cover_photo: null,
    description: null,
    id,
    lat: 51.1079,
    lon: 17.0385,
    memory_count: 0,
    photo_count: 0,
    preview_items: [],
    score: 0,
    slug: id,
    custom_fields: {},
    title: id,
    weight: 1,
    ...overrides,
  };
}

describe("map category filters", () => {
  it("builds compact controls only from active categories with supported icons", () => {
    const coffee = category({ id: "coffee", icon: "coffee", label: "Kawa", sort_order: 2 });
    const viewpoint = category({ id: "viewpoint", icon: "binoculars", label: "Widoki", sort_order: 1 });
    const archived = category({ id: "archived", icon: "heart", label: "Archiwum", status: "archived" });
    const textOnly = category({ id: "text-only", icon: null, label: "Bez ikony" });
    const unsupported = category({ id: "custom", icon: "custom-symbol", label: "Custom" });

    expect(
      getMapCategoryFilterItems([
        place({
          id: "first",
          category_ids: ["coffee", "viewpoint", "archived"],
          categories: [coffee, viewpoint, archived],
        }),
        place({
          id: "second",
          category_ids: ["coffee", "text-only", "custom"],
          categories: [coffee, textOnly, unsupported],
        }),
      ]),
    ).toEqual([
      { count: 1, icon: "binoculars", id: "viewpoint", label: "Widoki" },
      { count: 2, icon: "coffee", id: "coffee", label: "Kawa" },
    ]);
  });

  it("filters places by any selected category and treats empty selection as all places", () => {
    const places = [
      place({ id: "coffee", category_ids: ["coffee"] }),
      place({ id: "view", category_ids: ["viewpoint"] }),
      place({ id: "both", category_ids: ["coffee", "viewpoint"] }),
      place({ id: "other", category_ids: ["mural"] }),
    ];

    expect(filterMapPlacesByCategories(places, []).map((item) => item.id)).toEqual(["coffee", "view", "both", "other"]);
    expect(filterMapPlacesByCategories(places, ["coffee"]).map((item) => item.id)).toEqual(["coffee", "both"]);
    expect(filterMapPlacesByCategories(places, ["coffee", "viewpoint"]).map((item) => item.id)).toEqual([
      "coffee",
      "view",
      "both",
    ]);
  });

  it("toggles selected category ids without duplicate state", () => {
    expect(toggleMapCategoryFilter([], "coffee")).toEqual(["coffee"]);
    expect(toggleMapCategoryFilter(["coffee"], "viewpoint")).toEqual(["coffee", "viewpoint"]);
    expect(toggleMapCategoryFilter(["coffee", "viewpoint"], "coffee")).toEqual(["viewpoint"]);
  });

  it("keeps supported icon names separate from category ids", () => {
    expect(isSupportedMapCategoryIcon("coffee")).toBe(true);
    expect(isSupportedMapCategoryIcon("custom-category-id")).toBe(false);
    expect(isSupportedMapCategoryIcon(null)).toBe(false);
  });
});
