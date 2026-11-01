import { ChevronDown, ChevronUp, MapPinned, X } from "lucide-react";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, type RefCallback } from "react";

import { mediaUrl } from "../../../api/http";
import { stopFloatingWindowEvent } from "../../ui/useDraggableWindow";
import { mapMediaDisplay } from "../mediaDisplayText";
import type { PinnedMediaInteractionMode } from "./pinnedMediaBoardInteraction";
import type { PinnedMediaNaturalSize, ResolvedPinnedMediaCard } from "./pinnedMediaBoardTypes";
import { isPinnedMediaCaptionHidden } from "./pinnedMediaBoardLayout";

type PinnedMediaCardProps = {
  card: ResolvedPinnedMediaCard;
  cardRef: RefCallback<HTMLElement>;
  isActive: boolean;
  isLinked: boolean;
  onBringToFront: (id: string) => void;
  onMediaSizeChange: (id: string, naturalSize: PinnedMediaNaturalSize) => void;
  onRemove: (id: string) => void;
  onToggleCaption: (id: string) => void;
  onStartInteraction: (
    card: ResolvedPinnedMediaCard,
    mode: PinnedMediaInteractionMode,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onToggleMapLink: (id: string) => void;
};

export function PinnedMediaCard({
  card,
  cardRef,
  isActive,
  isLinked,
  onBringToFront,
  onMediaSizeChange,
  onRemove,
  onToggleCaption,
  onStartInteraction,
  onToggleMapLink,
}: PinnedMediaCardProps) {
  const copyHidden = isPinnedMediaCaptionHidden(card.layout);
  const display = mapMediaDisplay(card.item.kind, card.item.caption, card.place.description);
  const categoryLabel = card.place.categories[0]?.label ?? (card.item.kind === "memory" ? "Pamiątka" : "Zdjęcie");
  const style = {
    left: `${card.layout.x}px`,
    top: `${card.layout.y}px`,
    width: `${card.layout.width}px`,
    zIndex: card.layout.zIndex,
  } satisfies CSSProperties;

  return (
    <article
      className={["pinned-media-card", isActive ? "is-active" : null, isLinked ? "has-map-link" : null, copyHidden ? "is-copy-hidden" : null]
        .filter(Boolean)
        .join(" ")}
      ref={cardRef}
      style={style}
      tabIndex={0}
      aria-label={`Przypięte medium: ${card.place.title}`}
      data-media-card-id={card.id}
      data-testid="pinned-media-card"
      onClick={stopFloatingWindowEvent}
      onContextMenu={stopFloatingWindowEvent}
      onDoubleClick={stopFloatingWindowEvent}
      onFocus={() => onBringToFront(card.id)}
      onMouseDown={stopFloatingWindowEvent}
      onPointerDown={(event) => onStartInteraction(card, "drag", event)}
      onTouchStart={stopFloatingWindowEvent}
      onWheel={stopFloatingWindowEvent}
    >
      <div
        className="pinned-media-card-image-wrap"
        style={{ height: `${card.layout.height}px` }}
        title="Kliknij dwukrotnie, żeby pokazać miejsce na mapie"
        onDoubleClick={(event) => {
          event.stopPropagation();
          onToggleMapLink(card.id);
        }}
      >
        <img
          className="pinned-media-card-image"
          src={mediaUrl(card.item.public_path)}
          alt={card.item.caption ?? card.place.title}
          onLoad={(event) => {
            const image = event.currentTarget;
            onMediaSizeChange(card.id, {
              height: image.naturalHeight,
              width: image.naturalWidth,
            });
          }}
        />
        <button
          className={isLinked ? "pinned-media-card-map-link is-active" : "pinned-media-card-map-link"}
          type="button"
          aria-label={
            isLinked ? `Ukryj połączenie z mapą: ${card.place.title}` : `Pokaż miejsce na mapie: ${card.place.title}`
          }
          aria-pressed={isLinked}
          title={isLinked ? "Ukryj połączenie z mapą" : "Pokaż miejsce na mapie"}
          data-drag-ignore
          onClick={(event) => {
            event.stopPropagation();
            onToggleMapLink(card.id);
          }}
        >
          <MapPinned aria-hidden="true" size={14} />
        </button>
        <button
          className="pinned-media-card-caption-toggle"
          type="button"
          title={copyHidden ? "Pokaż opis" : "Ukryj opis"}
          aria-label={copyHidden ? "Pokaż opis przypiętego zdjęcia" : "Ukryj opis przypiętego zdjęcia"}
          data-drag-ignore
          onClick={(event) => { event.stopPropagation(); onToggleCaption(card.id); }}
        >
          {copyHidden ? <ChevronUp aria-hidden="true" size={14} /> : <ChevronDown aria-hidden="true" size={14} />}
        </button>
        <button
          className="pinned-media-card-remove"
          type="button"
          aria-label="Odepnij medium"
          title="Odepnij"
          data-drag-ignore
          onClick={(event) => {
            event.stopPropagation();
            onRemove(card.id);
          }}
        >
          <X aria-hidden="true" size={14} />
        </button>
      </div>
      {!copyHidden ? <div className="pinned-media-card-copy">
        <span className="pinned-media-card-eyebrow">{categoryLabel}</span>
        <span className="pinned-media-card-title">{card.place.title}</span>
        {display.title ? <span className="pinned-media-card-caption">{display.title}</span> : null}
      </div> : null}
      <button
        className="pinned-media-card-resize"
        type="button"
        aria-label="Zmień rozmiar karty"
        title="Zmień rozmiar"
        data-drag-ignore
        onPointerDown={(event) => onStartInteraction(card, "resize", event)}
      />
    </article>
  );
}
