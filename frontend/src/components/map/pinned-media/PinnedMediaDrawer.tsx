import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import { mediaUrl } from "../../../api/http";
import type { MapDiscoveryItem } from "../discoveryRecommendations";
import type { ResolvedPinnedMediaCard } from "./pinnedMediaBoardTypes";

type Props = {
  cards: ResolvedPinnedMediaCard[];
  recommendedItems: MapDiscoveryItem[];
  isOpen: boolean;
  isDragging: boolean;
  isDropActive: boolean;
  onToggle: () => void;
  onPreview: (card: ResolvedPinnedMediaCard) => void;
  onSelectRecommendedPlace: (placeId: string) => void;
  onStartUndock: (card: ResolvedPinnedMediaCard, event: ReactPointerEvent<HTMLElement>) => void;
};

export function PinnedMediaDrawer({
  cards,
  recommendedItems,
  isOpen,
  isDragging,
  isDropActive,
  onToggle,
  onPreview,
  onSelectRecommendedPlace,
  onStartUndock,
}: Props) {
  const gesture = useRef<{ y: number; swiped: boolean } | null>(null);
  const collapsedThumbs = [
    ...cards.map((card) => ({ id: card.id, thumb: card.item.thumb_path })),
    ...recommendedItems.map(({ place, item }) => ({ id: `suggested:${place.id}:${item.id}`, thumb: item.thumb_path })),
  ].slice(0, 3);

  return (
    <section
      className={[
        "pinned-media-drawer",
        isOpen ? "is-open" : null,
        isDragging ? "is-peeking" : null,
        isDropActive ? "is-drop-active" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Galeria zdjęć z mapy"
      data-testid="pinned-media-drawer"
    >
      <button
        className="pinned-media-drawer-handle"
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Zwiń szufladę zdjęć" : "Rozwiń szufladę zdjęć"}
        onPointerDown={(event) => {
          gesture.current = { y: event.clientY, swiped: false };
        }}
        onPointerUp={(event) => {
          const current = gesture.current;
          if (current && Math.abs(current.y - event.clientY) > 24) {
            current.swiped = true;
            if ((!isOpen && event.clientY < current.y) || (isOpen && event.clientY > current.y)) onToggle();
          }
        }}
        onClick={() => {
          if (gesture.current?.swiped) {
            gesture.current = null;
            return;
          }
          gesture.current = null;
          onToggle();
        }}
      >
        {isOpen ? (
          <span className="pinned-media-drawer-grab-line" aria-hidden="true" />
        ) : collapsedThumbs.length > 0 ? (
          <span className="pinned-media-drawer-handle-thumbs" aria-hidden="true">
            {collapsedThumbs.map(({ id, thumb }) => (
              <img key={id} src={mediaUrl(thumb)} alt="" draggable={false} />
            ))}
          </span>
        ) : (
          <span className="pinned-media-drawer-drag-label">Odkrywaj miejsca</span>
        )}
      </button>
      <div className="pinned-media-drawer-content">
        {cards.length === 0 && recommendedItems.length === 0 ? (
          <p className="pinned-media-drawer-hint">Brak zdjęć w widocznym obszarze mapy</p>
        ) : null}
        <div className="pinned-media-drawer-items">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="pinned-media-drawer-item pinned-media-drawer-item--pinned"
              title={`Przypięte: ${card.place.title}. Przeciągnij na mapę lub otwórz podgląd.`}
              aria-label={`Otwórz podgląd: ${card.place.title}`}
              onPointerDown={(event) => onStartUndock(card, event)}
              onDragStart={(event) => event.preventDefault()}
              onClick={() => onPreview(card)}
            >
              <img src={mediaUrl(card.item.thumb_path)} alt="" draggable={false} />
              <span>{card.place.title}</span>
            </button>
          ))}
          {recommendedItems.map(({ place, item }) => (
            <button
              key={`suggested:${place.id}:${item.id}`}
              type="button"
              className="pinned-media-drawer-item pinned-media-drawer-item--recommended"
              title={`Odkryj miejsce: ${place.title}`}
              aria-label={`Pokaż na mapie: ${place.title}`}
              onClick={() => onSelectRecommendedPlace(place.id)}
              onDragStart={(event) => event.preventDefault()}
            >
              <img src={mediaUrl(item.thumb_path)} alt="" loading="lazy" draggable={false} />
              <span>{place.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
