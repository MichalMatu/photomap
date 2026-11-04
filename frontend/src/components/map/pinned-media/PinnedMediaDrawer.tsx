import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { mediaUrl } from "../../../api/http";
import type { MapDiscoveryItem } from "../discoveryRecommendations";
import {
  DRAWER_HOLD_MS,
  isDrawerHoldMove,
  type PinnedMediaDrawerStage,
  shiftDrawerStage,
} from "./pinnedMediaDrawerStage";
import type { ResolvedPinnedMediaCard } from "./pinnedMediaBoardTypes";

type Props = {
  cards: ResolvedPinnedMediaCard[];
  recommendedItems: MapDiscoveryItem[];
  stage: PinnedMediaDrawerStage;
  isDragging: boolean;
  isDropActive: boolean;
  onStageChange: (stage: PinnedMediaDrawerStage) => void;
  onPreview: (card: ResolvedPinnedMediaCard) => void;
  onRemove: (id: string) => void;
  onSelectRecommendedPlace: (placeId: string) => void;
  onStartUndock: (card: ResolvedPinnedMediaCard, event: ReactPointerEvent<HTMLElement>) => void;
  onCancelUndock: (pointerId: number) => void;
};

type Hold = { pointerId: number; startX: number; startY: number; timeout: number };

export function PinnedMediaDrawer({
  cards,
  recommendedItems,
  stage,
  isDragging,
  isDropActive,
  onStageChange,
  onPreview,
  onRemove,
  onSelectRecommendedPlace,
  onStartUndock,
  onCancelUndock,
}: Props) {
  const gesture = useRef<{ pointerId: number; y: number; swiped: boolean } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hold = useRef<Hold | null>(null);
  const armedRef = useRef<string | null>(null);
  const suppressClick = useRef(false);
  const [armedId, setArmedId] = useState<string | null>(null);
  const clearArmed = useCallback(() => {
    armedRef.current = null;
    setArmedId(null);
  }, []);
  const cancelHold = useCallback(() => {
    if (hold.current !== null) {
      window.clearTimeout(hold.current.timeout);
      hold.current = null;
    }
  }, []);
  useEffect(() => () => cancelHold(), [cancelHold]);
  useEffect(() => {
    if (contentRef.current) contentRef.current.inert = stage === "collapsed";
  }, [stage]);
  useEffect(() => {
    if (armedId === null) return;
    const clearOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".pinned-media-drawer-remove")) return;
      suppressClick.current =
        event.target instanceof Element && Boolean(event.target.closest(".pinned-media-drawer-item--pinned"));
      clearArmed();
    };
    document.addEventListener("pointerdown", clearOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", clearOnOutsidePointer, true);
  }, [armedId, clearArmed]);
  useEffect(() => {
    if (armedId && !cards.some((card) => card.id === armedId)) clearArmed();
  }, [armedId, cards, clearArmed]);

  const collapsedThumbs = [
    ...cards.map((card) => ({ id: card.id, thumb: card.item.thumb_path })),
    ...(cards.length === 0
      ? recommendedItems.map(({ place, item }) => ({ id: `suggested:${place.id}:${item.id}`, thumb: item.thumb_path }))
      : []),
  ].slice(0, 3);
  const showDiscovery = stage === "discovery" || cards.length === 0;
  const stageLabel = stage === "collapsed" ? "Rozwiń szufladę zdjęć" : "Zwiń szufladę zdjęć";

  const startHold = (card: ResolvedPinnedMediaCard, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (armedRef.current) {
      clearArmed();
      suppressClick.current = true;
      return;
    }
    cancelHold();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const timeout = window.setTimeout(() => {
      hold.current = null;
      armedRef.current = card.id;
      setArmedId(card.id);
      suppressClick.current = true;
      onCancelUndock(pointerId);
    }, DRAWER_HOLD_MS);
    hold.current = { pointerId, startX, startY, timeout };
    onStartUndock(card, event);
  };

  const moveHold = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = hold.current;
    if (
      current &&
      current.pointerId === event.pointerId &&
      isDrawerHoldMove(current.startX, current.startY, event.clientX, event.clientY)
    ) {
      cancelHold();
    }
  };

  const renderPinned = (card: ResolvedPinnedMediaCard) => (
    <div className="pinned-media-drawer-pinned" key={card.id}>
      <button
        type="button"
        className="pinned-media-drawer-item pinned-media-drawer-item--pinned"
        title={`Przypięte: ${card.place.title}. Przytrzymaj, aby usunąć, lub przeciągnij na mapę.`}
        aria-label={`Otwórz podgląd: ${card.place.title}`}
        onPointerDown={(event) => startHold(card, event)}
        onPointerMove={moveHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            armedRef.current = card.id;
            setArmedId(card.id);
          }
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (!armedRef.current) onPreview(card);
        }}
      >
        <img src={mediaUrl(card.item.thumb_path)} alt="" draggable={false} />
        <span>{card.place.title}</span>
      </button>
      {armedId === card.id ? (
        <button
          type="button"
          className="pinned-media-drawer-remove"
          aria-label={`Usuń z kolekcji: ${card.place.title}`}
          title="Usuń z kolekcji"
          onPointerDown={(event) => {
            event.stopPropagation();
            cancelHold();
          }}
          onClick={(event) => {
            event.stopPropagation();
            clearArmed();
            onRemove(card.id);
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M5 5 19 19M19 5 5 19" />
          </svg>
        </button>
      ) : null}
    </div>
  );

  return (
    <section
      className={[
        "pinned-media-drawer",
        `pinned-media-drawer--${stage}`,
        stage !== "collapsed" ? "is-open" : null,
        isDragging ? "is-peeking" : null,
        isDropActive ? "is-drop-active" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Galeria zdjęć z mapy"
      data-testid="pinned-media-drawer"
      data-stage={stage}
    >
      <button
        className="pinned-media-drawer-handle"
        type="button"
        aria-expanded={stage !== "collapsed"}
        aria-label={stageLabel}
        onPointerDown={(event) => {
          gesture.current = { pointerId: event.pointerId, y: event.clientY, swiped: false };
          if (event.nativeEvent.isTrusted && event.currentTarget.setPointerCapture) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={(event) => {
          const current = gesture.current;
          if (current && current.pointerId === event.pointerId && Math.abs(current.y - event.clientY) > 24) {
            current.swiped = true;
            onStageChange(shiftDrawerStage(stage, event.clientY < current.y ? "up" : "down"));
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onClick={() => {
          if (gesture.current?.swiped) {
            gesture.current = null;
            return;
          }
          gesture.current = null;
          onStageChange(stage === "collapsed" ? "collection" : "collapsed");
        }}
      >
        <span className="pinned-media-drawer-grab-line" aria-hidden="true" />
        {stage === "collapsed" && collapsedThumbs.length > 0 ? (
          <span className="pinned-media-drawer-handle-thumbs" aria-hidden="true">
            {collapsedThumbs.map(({ id, thumb }) => (
              <img key={id} src={mediaUrl(thumb)} alt="" draggable={false} />
            ))}
          </span>
        ) : stage === "collapsed" ? (
          <span className="pinned-media-drawer-drag-label">Odkrywaj miejsca</span>
        ) : null}
      </button>
      <div ref={contentRef} className="pinned-media-drawer-content" aria-hidden={stage === "collapsed"}>
        {stage !== "collapsed" ? (
          <div className="pinned-media-drawer-toolbar">
            <button
              className="pinned-media-drawer-stage-button"
              type="button"
              onClick={() => onStageChange(stage === "discovery" ? "collection" : "discovery")}
            >
              {stage === "discovery" ? "Mniej zdjęć" : "Więcej zdjęć"}
            </button>
          </div>
        ) : null}
        {cards.length > 0 ? (
          <section className="pinned-media-drawer-section" aria-label="Przypięta kolekcja">
            <span className="pinned-media-drawer-section-label">Twoja kolekcja</span>
            <div className="pinned-media-drawer-items pinned-media-drawer-collection">{cards.map(renderPinned)}</div>
          </section>
        ) : null}
        {showDiscovery ? (
          <section className="pinned-media-drawer-section" aria-label="Zdjęcia z obszaru mapy">
            <span className="pinned-media-drawer-section-label">Zdjęcia z mapy</span>
            {recommendedItems.length === 0 ? (
              <p className="pinned-media-drawer-hint">Brak zdjęć w widocznym obszarze mapy</p>
            ) : (
              <div className="pinned-media-drawer-items pinned-media-drawer-discovery-grid">
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
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
