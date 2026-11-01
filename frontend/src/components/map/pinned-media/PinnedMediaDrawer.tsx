import { ChevronDown, ChevronUp } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import { mediaUrl } from "../../../api/http";
import type { ResolvedPinnedMediaCard } from "./pinnedMediaBoardTypes";

type Props = {
  cards: ResolvedPinnedMediaCard[];
  isOpen: boolean;
  isDragging: boolean;
  isDropActive: boolean;
  onToggle: () => void;
  onPreview: (card: ResolvedPinnedMediaCard) => void;
  onStartUndock: (card: ResolvedPinnedMediaCard, event: ReactPointerEvent<HTMLElement>) => void;
};

export function PinnedMediaDrawer({
  cards,
  isOpen,
  isDragging,
  isDropActive,
  onToggle,
  onPreview,
  onStartUndock,
}: Props) {
  const gesture = useRef<{ y: number; swiped: boolean } | null>(null);
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
      aria-label="Szuflada przypiętych zdjęć"
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
        {isOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        <span>Przypięte ({cards.length})</span>
        {!isOpen ? (
          <span className="pinned-media-drawer-handle-thumbs" aria-hidden="true">
            {cards.slice(0, 3).map((card) => (
              <img key={card.id} src={mediaUrl(card.item.thumb_path)} alt="" />
            ))}
          </span>
        ) : null}
      </button>
      <div className="pinned-media-drawer-content">
        {cards.length === 0 ? <p className="pinned-media-drawer-hint">Przeciągnij przypięte zdjęcie tutaj</p> : null}
        <div className="pinned-media-drawer-items">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="pinned-media-drawer-item"
              title={`Otwórz podgląd: ${card.place.title}`}
              aria-label={`Otwórz podgląd: ${card.place.title}`}
              onPointerDown={(event) => onStartUndock(card, event)}
              onClick={() => onPreview(card)}
            >
              <img src={mediaUrl(card.item.thumb_path)} alt="" draggable={false} />
              <span>{card.place.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
