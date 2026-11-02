type Props = {
  hasPinnedDrawer: boolean;
  isPinnedDrawerOpen: boolean;
  isDiscoveryOpen: boolean;
};

/** Small, readable OSM attribution link that never overlaps the pinned drawer. */
export function MapAttribution({ hasPinnedDrawer, isPinnedDrawerOpen, isDiscoveryOpen }: Props) {
  const classes = [
    "map-attribution",
    hasPinnedDrawer ? "map-attribution--with-drawer" : null,
    isPinnedDrawerOpen ? "map-attribution--drawer-open" : null,
    isDiscoveryOpen ? "map-attribution--drawer-discovery" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-testid="map-attribution">
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
        © OpenStreetMap
      </a>
    </div>
  );
}
