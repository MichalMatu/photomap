import { BrushCleaning, Tags } from "lucide-react";

import { getMapCategoryIcon, MAX_RAIL_CATEGORY_BUTTONS } from "./appShellItems";
import type { AppShellMapCategoryControls as AppShellMapCategoryControlsType } from "./appShellTypes";

type RailProps = {
  controls: AppShellMapCategoryControlsType;
  onOpenDrawer: () => void;
};

type DrawerProps = {
  controls: AppShellMapCategoryControlsType;
};

export function RailMapCategoryControls({ controls, onOpenDrawer }: RailProps) {
  const categoryItems = controls.items;
  const shouldShowRailCategoryIcons = categoryItems.length > 0 && categoryItems.length <= MAX_RAIL_CATEGORY_BUTTONS;
  const shouldShowCategoryMenuButton = categoryItems.length > MAX_RAIL_CATEGORY_BUTTONS;

  if (categoryItems.length === 0) {
    return null;
  }

  return (
    <nav className="rail-category-nav" aria-label="Kategorie mapy">
      {shouldShowRailCategoryIcons
        ? categoryItems.map((item) => {
            const CategoryIcon = getMapCategoryIcon(item.icon);
            return (
              <button
                className={item.active ? "rail-category-button is-active" : "rail-category-button"}
                type="button"
                key={item.id}
                aria-label={`${item.label}: ${item.count}`}
                aria-pressed={item.active}
                title={`${item.label} (${item.count})`}
                onClick={() => controls.onToggle(item.id)}
              >
                <CategoryIcon aria-hidden="true" size={22} />
              </button>
            );
          })
        : null}
      {shouldShowCategoryMenuButton ? (
        <button
          className={controls.selectedCount > 0 ? "rail-category-button is-active" : "rail-category-button"}
          type="button"
          aria-label="Otwórz kategorie mapy"
          title="Kategorie"
          onClick={onOpenDrawer}
        >
          <Tags aria-hidden="true" size={22} />
          <strong>{controls.selectedCount || categoryItems.length}</strong>
        </button>
      ) : null}
    </nav>
  );
}

export function DrawerMapCategoryControls({ controls }: DrawerProps) {
  const categoryItems = controls.items;

  if (categoryItems.length === 0) {
    return null;
  }

  return (
    <nav className="drawer-section drawer-section--categories" aria-label="Kategorie mapy">
      <div className="drawer-category-grid">
        {categoryItems.map((item) => {
          const CategoryIcon = getMapCategoryIcon(item.icon);
          return (
            <button
              className={item.active ? "drawer-category-button is-active" : "drawer-category-button"}
              type="button"
              key={item.id}
              aria-label={`${item.label}: ${item.count}`}
              aria-pressed={item.active}
              title={`${item.label} (${item.count})`}
              onClick={() => controls.onToggle(item.id)}
            >
              <CategoryIcon aria-hidden="true" size={24} />
              <strong>{item.count}</strong>
            </button>
          );
        })}
        {controls.selectedCount > 0 ? (
          <button
            className="drawer-category-button drawer-category-button--clear"
            type="button"
            aria-label="Wyczyść kategorie"
            title="Wyczyść kategorie"
            onClick={controls.onClear}
          >
            <BrushCleaning aria-hidden="true" size={24} />
          </button>
        ) : null}
      </div>
    </nav>
  );
}
