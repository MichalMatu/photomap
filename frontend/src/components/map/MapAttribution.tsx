import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  hasPinnedDrawer: boolean;
  isPinnedDrawerOpen: boolean;
};

/**
 * OSM attribution is shown on initial map load for five seconds.
 * Afterwards the attribution remains one tap away at a visible information button.
 * Never overlap the pinned media drawer or obscure its handle.
 */
export function MapAttribution({ hasPinnedDrawer, isPinnedDrawerOpen }: Props) {
  const [isCompact, setIsCompact] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsCompact(true), 5000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const classes = [
    "map-attribution",
    hasPinnedDrawer ? "map-attribution--with-drawer" : null,
    isPinnedDrawerOpen ? "map-attribution--drawer-open" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-testid="map-attribution">
      {isCompact && !isExpanded ? (
        <button
          aria-label="Źródło mapy i licencja OpenStreetMap"
          className="map-attribution-toggle"
          onClick={() => setIsExpanded(true)}
          title="Źródło mapy"
          type="button"
        >
          <Info size={16} aria-hidden="true" />
        </button>
      ) : (
        <div className="map-attribution-details">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            © OpenStreetMap
          </a>
          {isCompact ? (
            <button
              aria-label="Zwiń informację o źródle mapy"
              className="map-attribution-close"
              onClick={() => setIsExpanded(false)}
              type="button"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
