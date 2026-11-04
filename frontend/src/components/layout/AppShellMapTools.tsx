import { Check, Images, MapPin, Settings2, SlidersHorizontal, Volume2, VolumeX, X } from "lucide-react";
import type {
  AppShellMapAudioControl,
  AppShellMapCategoryControls,
  AppShellMapLayerControls,
  AppShellMapMarkerModeControl,
  AppShellMapPinnedMediaControl,
} from "./appShellTypes";

export type MapToolsPanel = "filters" | "display";

type Props = {
  panel: MapToolsPanel | null;
  onPanelChange: (panel: MapToolsPanel) => void;
  mapAudioControl: AppShellMapAudioControl;
  mapCategoryControls: AppShellMapCategoryControls;
  mapLayerControls: AppShellMapLayerControls;
  mapMarkerModeControl: AppShellMapMarkerModeControl;
  mapPinnedMediaControl: AppShellMapPinnedMediaControl;
};

export function AppShellMapTools({
  panel,
  onPanelChange,
  mapAudioControl,
  mapCategoryControls,
  mapLayerControls,
  mapMarkerModeControl,
  mapPinnedMediaControl,
}: Props) {
  const selectedLayer = mapLayerControls.items.find((item) => item.active && item.id !== "all");
  const filterCount = mapCategoryControls.selectedCount + (selectedLayer ? 1 : 0);
  const memoryCount = mapLayerControls.items.find((item) => item.id === "memories")?.count ?? 0;
  const modes = mapLayerControls.items.filter(
    (item) =>
      item.id === "all" ||
      (item.id === "featured" && item.count > 0) ||
      (item.id === "memories" && item.count > 0) ||
      (item.id === "places" && memoryCount > 0),
  );
  const close = () => {
    if (panel) onPanelChange(panel);
  };

  return (
    <div className="map-tools">
      <div className="map-tools-toolbar" role="group" aria-label="Narzędzia mapy">
        <button
          className={panel === "filters" || filterCount > 0 ? "map-tools-trigger is-active" : "map-tools-trigger"}
          type="button"
          aria-label={filterCount > 0 ? `Filtry mapy: ${filterCount} aktywne` : "Filtry mapy"}
          aria-controls="map-tools-panel"
          aria-expanded={panel === "filters"}
          onClick={() => onPanelChange("filters")}
        >
          <SlidersHorizontal size={19} aria-hidden="true" />
          <span>Filtry</span>
          {filterCount > 0 ? <strong>{filterCount}</strong> : null}
        </button>
        <button
          className={panel === "display" ? "map-tools-trigger is-active" : "map-tools-trigger"}
          type="button"
          aria-label="Ustawienia widoku mapy"
          aria-controls="map-tools-panel"
          aria-expanded={panel === "display"}
          onClick={() => onPanelChange("display")}
        >
          <Settings2 size={19} aria-hidden="true" />
          <span>Widok</span>
        </button>
      </div>

      {panel ? (
        <aside className="map-tools-panel" id="map-tools-panel" aria-label={panel === "filters" ? "Filtry mapy" : "Ustawienia widoku mapy"}>
          <div className="map-tools-heading">
            <strong>{panel === "filters" ? "Filtry" : "Widok mapy"}</strong>
            <button type="button" className="map-tools-close" aria-label="Zamknij panel" onClick={close}>
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          {panel === "filters" ? (
            <div className="map-tools-body">
              <section className="map-tools-group" aria-label="Rodzaj treści">
                <span className="map-tools-caption">Pokaż na mapie</span>
                <div className="map-tools-options">
                  {modes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.active ? "map-tools-option is-active" : "map-tools-option"}
                      aria-pressed={item.active}
                      onClick={() => mapLayerControls.onToggle(item.id)}
                    >
                      <span>{item.id === "memories" ? "Z pamiątkami" : item.label}</span>
                      {item.active ? <Check size={16} aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              </section>
              {mapCategoryControls.items.length > 0 ? (
                <section className="map-tools-group" aria-label="Kategorie miejsc">
                  <span className="map-tools-caption">Kategorie miejsc</span>
                  <div className="map-tools-options map-tools-options--categories">
                    {mapCategoryControls.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={item.active ? "map-tools-option is-active" : "map-tools-option"}
                        aria-pressed={item.active}
                        onClick={() => mapCategoryControls.onToggle(item.id)}
                      >
                        <span>{item.label}</span>
                        <small>{item.count}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              <div className="map-tools-footer">
                <span>{mapCategoryControls.resultCount} miejsc na mapie</span>
                {filterCount > 0 ? (
                  <button
                    type="button"
                    className="ui-button ui-button--ghost"
                    onClick={() => {
                      mapLayerControls.onToggle("all");
                      mapCategoryControls.onClear();
                    }}
                  >
                    Wyczyść
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="map-tools-body">
              <section className="map-tools-group" aria-label="Sposób wyświetlania miejsc">
                <span className="map-tools-caption">Miejsca na mapie</span>
                <div className="map-tools-options">
                  <button
                    type="button"
                    className={mapMarkerModeControl.mode === "photos" ? "map-tools-option is-active" : "map-tools-option"}
                    aria-pressed={mapMarkerModeControl.mode === "photos"}
                    onClick={() => mapMarkerModeControl.onChange("photos")}
                  >
                    <Images size={18} aria-hidden="true" />
                    <span>Miniatury</span>
                  </button>
                  <button
                    type="button"
                    className={mapMarkerModeControl.mode === "pins" ? "map-tools-option is-active" : "map-tools-option"}
                    aria-pressed={mapMarkerModeControl.mode === "pins"}
                    onClick={() => mapMarkerModeControl.onChange("pins")}
                  >
                    <MapPin size={18} aria-hidden="true" />
                    <span>Pinezki</span>
                  </button>
                </div>
              </section>
              <section className="map-tools-group" aria-label="Pozostałe ustawienia">
                <span className="map-tools-caption">Dodatkowe elementy</span>
                <button
                  type="button"
                  className="map-tools-option map-tools-option--toggle"
                  aria-pressed={mapPinnedMediaControl.active}
                  onClick={mapPinnedMediaControl.onToggle}
                >
                  <Images size={18} aria-hidden="true" />
                  <span>Pokaż szufladę zdjęć</span>
                  <span className={mapPinnedMediaControl.active ? "map-tools-switch is-active" : "map-tools-switch"} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="map-tools-option map-tools-option--toggle"
                  aria-pressed={mapAudioControl.active}
                  onClick={mapAudioControl.onToggle}
                >
                  {mapAudioControl.active ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
                  <span>Automatyczne audio</span>
                  <span className={mapAudioControl.active ? "map-tools-switch is-active" : "map-tools-switch"} aria-hidden="true" />
                </button>
              </section>
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}
