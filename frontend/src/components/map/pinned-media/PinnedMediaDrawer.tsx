import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { mediaUrl } from "../../../api/http";
import type { MapDiscoveryItem } from "../discoveryRecommendations";
import {
  DRAWER_HOLD_MS,
  DRAWER_DRAG_THRESHOLD,
  clampDrawerHeight,
  drawerHeightLimits,
  drawerStageForHeight,
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
type DrawerGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  startHeight: number;
  height: number;
  moved: boolean;
  previousHeight: string;
  captureTarget: HTMLElement;
};

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
  const gesture = useRef<DrawerGesture | null>(null);
  const frameRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const suppressHandleClick = useRef(false);
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
  const stageLabel =
    stage === "collapsed"
      ? "Rozwiń szufladę zdjęć"
      : stage === "collection"
        ? "Pokaż więcej zdjęć z mapy"
        : "Zwiń do kolekcji zdjęć";

  const clearCustomHeight = useCallback(() => {
    const frame = frameRef.current;
    frame?.style.removeProperty("--pinned-drawer-live-height");
    frame?.classList.remove("is-drawer-resizing");
  }, []);

  useEffect(() => {
    if (stage === "collapsed" && !gesture.current) clearCustomHeight();
  }, [stage, clearCustomHeight]);
  useEffect(() => () => clearCustomHeight(), [clearCustomHeight]);

  // Measure the *natural* content rather than scrollHeight (which includes the
  // currently allocated empty space). This is the shared discovery maximum for
  // the drawer, Leaflet viewport and OSM attribution.
  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    const content = contentRef.current;
    const frame = drawer?.closest<HTMLElement>(".map-frame");
    if (!drawer || !content || !frame) return;
    frameRef.current = frame;

    const fitContent = () => {
      const last = content.lastElementChild as HTMLElement | null;
      const style = window.getComputedStyle(content);
      const contentTop = content.getBoundingClientRect().top;
      const natural = last
        ? last.getBoundingClientRect().bottom - contentTop + content.scrollTop
        : 0;
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const handleHeight = window.matchMedia("(pointer: coarse)").matches ? 44 : 30;
      const { collection, discovery } = drawerHeightLimits(window.innerWidth, window.innerHeight);
      const required = handleHeight + Math.max(natural, paddingTop) + paddingBottom + 2;
      const fitted = Math.min(discovery, Math.max(collection, Math.ceil(required)));
      frame.style.setProperty("--pinned-drawer-fit-height", fitted + "px");
    };
    fitContent();
    const observer = new ResizeObserver(fitContent);
    Array.from(content.children).forEach((child) => observer.observe(child));
    window.addEventListener("resize", fitContent);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitContent);
    };
  }, [cards.length, recommendedItems.length, stage]);

  useEffect(() => {
    return () => {
      frameRef.current?.style.removeProperty("--pinned-drawer-fit-height");
    };
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    frameRef.current?.classList.remove("is-drawer-resizing");
  }, []);

  const beginResize = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || gesture.current) return;
    const frame = event.currentTarget.closest<HTMLElement>(".map-frame");
    const drawer = event.currentTarget.closest<HTMLElement>(".pinned-media-drawer");
    if (!frame || !drawer) return;
    frameRef.current = frame;
    drawerRef.current = drawer;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      startHeight: window.innerHeight - drawer.getBoundingClientRect().top,
      height: window.innerHeight - drawer.getBoundingClientRect().top,
      moved: false,
      previousHeight: frame.style.getPropertyValue("--pinned-drawer-live-height"),
      captureTarget: event.currentTarget,
    };
    if (event.nativeEvent.isTrusted) event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateResize = useCallback((event: Pick<PointerEvent, "pointerId" | "clientX" | "clientY">) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaY = current.startY - event.clientY;
    const deltaX = current.startX - event.clientX;
    if (!current.moved) {
      if (Math.abs(deltaY) < DRAWER_DRAG_THRESHOLD || Math.abs(deltaY) < Math.abs(deltaX)) return;
      current.moved = true;
      setIsResizing(true);
      frameRef.current?.classList.add("is-drawer-resizing");
    }
    const { discovery } = drawerHeightLimits(window.innerWidth, window.innerHeight);
    const available = Number.parseFloat(frameRef.current?.style.getPropertyValue("--pinned-drawer-fit-height") || "");
    const maximum = Number.isFinite(available) ? Math.min(discovery, available) : discovery;
    current.height = clampDrawerHeight(current.startHeight + deltaY, maximum);
    frameRef.current?.style.setProperty("--pinned-drawer-live-height", current.height + "px");
  }, []);

  const cancelResize = useCallback(
    (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      gesture.current = null;
      stopResizing();
      if (current.previousHeight) {
        frameRef.current?.style.setProperty("--pinned-drawer-live-height", current.previousHeight);
      } else {
        clearCustomHeight();
      }
    },
    [clearCustomHeight, stopResizing],
  );

  const finishResize = useCallback(
    (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      updateResize(event);
      gesture.current = null;
      stopResizing();
      if (current.captureTarget.hasPointerCapture(event.pointerId)) {
        current.captureTarget.releasePointerCapture(event.pointerId);
      }
      if (!current.moved) return;

      suppressHandleClick.current = true;
      window.setTimeout(() => {
        suppressHandleClick.current = false;
      }, 0);
      const distance = event.clientY - current.startY;
      const quickSwipe = Math.abs(distance) >= 35 && performance.now() - current.startedAt < 280;
      if (quickSwipe) {
        clearCustomHeight();
        onStageChange(shiftDrawerStage(stage, distance < 0 ? "up" : "down"));
        return;
      }
      const nextStage = drawerStageForHeight(
        current.height,
        drawerHeightLimits(window.innerWidth, window.innerHeight).collection,
      );
      if (nextStage === "collapsed") clearCustomHeight();
      onStageChange(nextStage);
    },
    [clearCustomHeight, onStageChange, stage, stopResizing, updateResize],
  );

  // Pointer events continue outside the visual 30px grabber. Native capture is
  // retained when available, but document listeners also cover synthetic touch
  // tests and browsers that dispatch a move over the map after leaving the handle.
  useEffect(() => {
    document.addEventListener("pointermove", updateResize);
    document.addEventListener("pointerup", finishResize);
    document.addEventListener("pointercancel", cancelResize);
    return () => {
      document.removeEventListener("pointermove", updateResize);
      document.removeEventListener("pointerup", finishResize);
      document.removeEventListener("pointercancel", cancelResize);
    };
  }, [cancelResize, finishResize, updateResize]);

  const resizeGestureHandlers = { onPointerDown: beginResize };

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
      ref={drawerRef}
      className={[
        "pinned-media-drawer",
        `pinned-media-drawer--${stage}`,
        stage !== "collapsed" ? "is-open" : null,
        isResizing ? "is-resizing" : null,
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
        {...resizeGestureHandlers}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          clearCustomHeight();
          onStageChange(shiftDrawerStage(stage, event.key === "ArrowUp" ? "up" : "down"));
        }}
        onClick={() => {
          if (suppressHandleClick.current) {
            suppressHandleClick.current = false;
            return;
          }
          clearCustomHeight();
          onStageChange(stage === "discovery" ? "collection" : shiftDrawerStage(stage, "up"));
        }}
      >
        {stage !== "collapsed" || isResizing ? (
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
      <div ref={contentRef} className="pinned-media-drawer-content">
        {cards.length > 0 ? (
          <section className="pinned-media-drawer-section" aria-label="Przypięta kolekcja">
            <span className="pinned-media-drawer-section-label" {...resizeGestureHandlers}>
              Twoja kolekcja
            </span>
            <div className="pinned-media-drawer-items pinned-media-drawer-collection">{cards.map(renderPinned)}</div>
          </section>
        ) : null}
        {showDiscovery ? (
          <section className="pinned-media-drawer-section" aria-label="Zdjęcia z obszaru mapy">
            {cards.length > 0 ? (
              <span className="pinned-media-drawer-section-label" {...resizeGestureHandlers}>
                Zdjęcia z mapy
              </span>
            ) : null}
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
