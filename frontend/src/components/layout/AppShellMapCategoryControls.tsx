import { BrushCleaning } from "lucide-react";

import { getMapCategoryIcon } from "./appShellItems";
import type { AppShellMapCategoryControls as AppShellMapCategoryControlsType } from "./appShellTypes";

type DrawerProps = {
  controls: AppShellMapCategoryControlsType;
};

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
