import type { Category, PlaceMapItem } from "../../api/types";

const SUPPORTED_MAP_CATEGORY_ICONS = new Set([
  "binoculars",
  "cloud-rain",
  "coffee",
  "coins",
  "heart",
  "landmark",
  "moon",
  "palette",
  "sandwich",
  "sparkles",
  "utensils",
]);

export type MapCategoryFilterItem = {
  count: number;
  icon: string;
  id: string;
  label: string;
};

export function isSupportedMapCategoryIcon(icon: string | null): icon is string {
  return Boolean(icon && SUPPORTED_MAP_CATEGORY_ICONS.has(icon));
}

function categoryFromPlace(place: PlaceMapItem, categoryId: string): Category | null {
  return place.categories.find((category) => category.id === categoryId) ?? null;
}

export function getMapCategoryFilterItems(places: PlaceMapItem[]): MapCategoryFilterItem[] {
  const categoriesById = new Map<string, Category>();
  const countsById = new Map<string, number>();

  for (const place of places) {
    const countedCategoryIds = new Set<string>();
    for (const categoryId of place.category_ids) {
      const category = categoryFromPlace(place, categoryId);
      if (!category || category.status !== "active" || !isSupportedMapCategoryIcon(category.icon)) {
        continue;
      }
      if (!categoriesById.has(category.id)) {
        categoriesById.set(category.id, category);
      }
      countedCategoryIds.add(category.id);
    }
    for (const categoryId of countedCategoryIds) {
      countsById.set(categoryId, (countsById.get(categoryId) ?? 0) + 1);
    }
  }

  return Array.from(categoriesById.values())
    .sort((firstCategory, secondCategory) => {
      if (firstCategory.sort_order !== secondCategory.sort_order) {
        return firstCategory.sort_order - secondCategory.sort_order;
      }
      return firstCategory.label.localeCompare(secondCategory.label, "pl");
    })
    .map((category) => ({
      count: countsById.get(category.id) ?? 0,
      icon: category.icon ?? "",
      id: category.id,
      label: category.label,
    }));
}

export function toggleMapCategoryFilter(selectedCategoryIds: string[], categoryId: string): string[] {
  return selectedCategoryIds.includes(categoryId)
    ? selectedCategoryIds.filter((selectedCategoryId) => selectedCategoryId !== categoryId)
    : [...selectedCategoryIds, categoryId];
}

export function filterMapPlacesByCategories(places: PlaceMapItem[], selectedCategoryIds: string[]) {
  if (selectedCategoryIds.length === 0) {
    return places;
  }

  const selectedCategoryIdSet = new Set(selectedCategoryIds);
  return places.filter((place) => place.category_ids.some((categoryId) => selectedCategoryIdSet.has(categoryId)));
}
