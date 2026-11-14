import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { PlaceMapItem } from "../../../api/types";
import type { MapDiscoveryItem } from "../discoveryRecommendations";
import { isInteractiveDragTarget } from "../../ui/useDraggableWindow";
import { PinnedMediaCard } from "./PinnedMediaCard";
import { PinnedMediaDrawer } from "./PinnedMediaDrawer";
import type { PinnedMediaDrawerStage } from "./pinnedMediaDrawerStage";
import { PinnedMediaMapLink } from "./PinnedMediaMapLink";
import { measurePinnedMediaCardRects, rectRecordsEqual } from "./pinnedMediaBoardDom";
import {
  getPinnedMediaBounds,
  resizePinnedMediaLayoutFromPointer,
  snapPinnedMediaLayout,
  snapPinnedMediaResizeLayout,
} from "./pinnedMediaBoardLayout";
import { isPinnedMediaDrawerDropTarget } from "./pinnedMediaDrawerGeometry";
import { pinnedMediaConnectionGeometry } from "./pinnedMediaBoardLinkGeometry";
import type { PinnedMediaInteractionMode, PinnedMediaInteractionState } from "./pinnedMediaBoardInteraction";
import type {
  PinnedMediaLayout,
  PinnedMediaNaturalSize,
  PinnedMediaPoint,
  RectLike,
  ResolvedPinnedMediaCard,
} from "./pinnedMediaBoardTypes";

export type PinnedMediaPlaceProjector = (place: Pick<PlaceMapItem, "lat" | "lon">) => PinnedMediaPoint | null;

type PinnedMediaBoardProps = {
  cards: ResolvedPinnedMediaCard[];
  recommendedItems: MapDiscoveryItem[];
  onSelectRecommendedPlace: (placeId: string) => void;
  notice: string | null;
  drawerStage: PinnedMediaDrawerStage;
  onDrawerStageChange: (stage: PinnedMediaDrawerStage) => void;
  onBringToFront: (id: string) => void;
  onDock: (id: string) => void;
  onUndock: (id: string) => void;
  onPreview: (card: ResolvedPinnedMediaCard) => void;
  onLayoutChange: (id: string, layout: PinnedMediaLayout) => void;
  onMediaSizeChange: (id: string, naturalSize: PinnedMediaNaturalSize) => void;
  onRemove: (id: string) => void;
  projectPlacePoint?: PinnedMediaPlaceProjector | null;
};

type UndockInteraction = {
  card: ResolvedPinnedMediaCard;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  captureTarget: HTMLElement;
};

export function PinnedMediaBoard({
  cards,
  recommendedItems,
  onSelectRecommendedPlace,
  notice,
  drawerStage,
  onDrawerStageChange,
  onBringToFront,
  onDock,
  onUndock,
  onPreview,
  onLayoutChange,
  onMediaSizeChange,
  onRemove,
  projectPlacePoint = null,
}: PinnedMediaBoardProps) {
  const cardsRef = useRef(cards);
  const cardElementsRef = useRef(new Map<string, HTMLElement>());
  const interactionRef = useRef<PinnedMediaInteractionState | null>(null);
  const undockRef = useRef<UndockInteraction | null>(null);
  const suppressFloatingClickRef = useRef(false);
  const suppressDrawerClickRef = useRef(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [cardRects, setCardRects] = useState<Record<string, RectLike>>({});
  const [linkedCardId, setLinkedCardId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const isDrawerOpen = drawerStage !== "collapsed";
  const floatingCards = cards.filter((card) => !card.docked);
  const dockedCards = cards.filter((card) => card.docked);
  const pinnedItemKeys = new Set(cards.map((card) => `${card.place.id}:${card.item.kind}:${card.item.id}`));
  const availableRecommendations = recommendedItems.filter(
    ({ place, item }) => !pinnedItemKeys.has(`${place.id}:${item.kind}:${item.id}`),
  );

  const measureCardRects = useCallback(() => {
    const nextRects = measurePinnedMediaCardRects(
      cardsRef.current.filter((card) => !card.docked),
      cardElementsRef.current,
    );
    setCardRects((current) => (rectRecordsEqual(current, nextRects) ? current : nextRects));
  }, []);
  const setCardElement = useCallback((id: string, element: HTMLElement | null) => {
    if (element) cardElementsRef.current.set(id, element);
    else cardElementsRef.current.delete(id);
  }, []);
  useLayoutEffect(() => {
    cardsRef.current = cards;
    measureCardRects();
  }, [cards, measureCardRects]);
  useEffect(() => {
    window.addEventListener("resize", measureCardRects);
    return () => window.removeEventListener("resize", measureCardRects);
  }, [measureCardRects]);
  useEffect(() => {
    if (linkedCardId && !floatingCards.some((card) => card.id === linkedCardId)) setLinkedCardId(null);
  }, [floatingCards, linkedCardId]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (isDragging || interactionRef.current || undockRef.current) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".pinned-media-drawer, .pinned-media-card, [role='dialog']")) return;
      onDrawerStageChange("collapsed");
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [isDragging, isDrawerOpen, onDrawerStageChange]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const undock = undockRef.current;
      if (undock && undock.pointerId === event.pointerId) {
        if (event.cancelable) event.preventDefault();
        if (Math.hypot(event.clientX - undock.startX, event.clientY - undock.startY) > 8) {
          undock.moved = true;
          suppressDrawerClickRef.current = true;
        }
        return;
      }
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) return;
      event.preventDefault();
      if (!interaction.hasPointerCapture) {
        interaction.captureTarget.setPointerCapture(interaction.pointerId);
        interaction.hasPointerCapture = true;
      }
      const currentCards = cardsRef.current;
      const currentCard = currentCards.find((card) => card.id === interaction.cardId);
      const zIndex = currentCard?.layout.zIndex ?? interaction.startLayout.zIndex;
      const otherLayouts = currentCards
        .filter((card) => card.id !== interaction.cardId && !card.docked)
        .map((card) => card.layout);
      const deltaX = event.clientX - interaction.startClientX;
      const deltaY = event.clientY - interaction.startClientY;
      if (Math.hypot(deltaX, deltaY) > 8) suppressFloatingClickRef.current = true;
      const bounds = getPinnedMediaBounds();
      const nextLayout =
        interaction.mode === "drag"
          ? {
              ...interaction.startLayout,
              x: interaction.startLayout.x + deltaX,
              y: interaction.startLayout.y + deltaY,
              zIndex,
            }
          : resizePinnedMediaLayoutFromPointer(interaction.startLayout, deltaX, deltaY, zIndex);
      onLayoutChange(
        interaction.cardId,
        interaction.mode === "resize"
          ? snapPinnedMediaResizeLayout(nextLayout, otherLayouts, bounds)
          : snapPinnedMediaLayout(nextLayout, otherLayouts, bounds),
      );
      if (interaction.mode === "drag" && Math.hypot(deltaX, deltaY) > 8) {
        setIsDragging(true);
        setIsDropActive(isPinnedMediaDrawerDropTarget(event.clientX, event.clientY, bounds, isDrawerOpen));
      }
    };
    const handlePointerEnd = (event: PointerEvent) => {
      const undock = undockRef.current;
      if (undock && undock.pointerId === event.pointerId) {
        undockRef.current = null;
        if (undock.captureTarget.hasPointerCapture(event.pointerId)) {
          undock.captureTarget.releasePointerCapture(event.pointerId);
        }
        const bounds = getPinnedMediaBounds();
        const overDrawer = isPinnedMediaDrawerDropTarget(event.clientX, event.clientY, bounds, isDrawerOpen);
        if (undock.moved && !overDrawer) {
          onUndock(undock.card.id);
          onLayoutChange(undock.card.id, {
            ...undock.card.layout,
            x: event.clientX - undock.card.layout.width / 2,
            y: event.clientY - undock.card.layout.height / 2,
          });
          onBringToFront(undock.card.id);
        }
        return;
      }
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) return;
      if (interaction.hasPointerCapture && interaction.captureTarget.hasPointerCapture(interaction.pointerId)) {
        interaction.captureTarget.releasePointerCapture(interaction.pointerId);
      }
      if (
        interaction.mode === "drag" &&
        isDragging &&
        isPinnedMediaDrawerDropTarget(event.clientX, event.clientY, getPinnedMediaBounds(), isDrawerOpen)
      ) {
        onDock(interaction.cardId);
        onDrawerStageChange("collection");
      }
      interactionRef.current = null;
      setActiveCardId(null);
      setIsDragging(false);
      setIsDropActive(false);
    };
    const handlePointerCancel = (event: PointerEvent) => {
      const undock = undockRef.current;
      if (undock?.pointerId === event.pointerId) {
        undockRef.current = null;
        suppressDrawerClickRef.current = true;
        if (undock.captureTarget.hasPointerCapture(event.pointerId)) {
          undock.captureTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }
      const interaction = interactionRef.current;
      if (interaction?.pointerId === event.pointerId) {
        interactionRef.current = null;
        setActiveCardId(null);
        setIsDragging(false);
        setIsDropActive(false);
      }
    };
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerEnd);
      document.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [isDrawerOpen, isDragging, onBringToFront, onDock, onDrawerStageChange, onLayoutChange, onUndock]);

  const startInteraction = useCallback(
    (card: ResolvedPinnedMediaCard, mode: PinnedMediaInteractionMode, event: ReactPointerEvent<HTMLElement>) => {
      event.stopPropagation();
      if (event.button !== 0 || (mode === "drag" && isInteractiveDragTarget(event.target))) return;
      suppressFloatingClickRef.current = mode === "resize";
      onBringToFront(card.id);
      setActiveCardId(card.id);
      interactionRef.current = {
        cardId: card.id,
        captureTarget: event.currentTarget,
        hasPointerCapture: mode === "resize",
        mode,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLayout: card.layout,
      };
      if (mode === "resize") {
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    },
    [onBringToFront],
  );
  const startUndock = useCallback((card: ResolvedPinnedMediaCard, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
    suppressDrawerClickRef.current = false;
    // Capturing the pointer keeps the drag alive on Windows when leaving the
    // horizontally scrollable drawer and prevents native image drag selection.
    event.currentTarget.setPointerCapture(event.pointerId);
    undockRef.current = {
      captureTarget: event.currentTarget,
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }, []);
  const cancelUndock = useCallback((pointerId: number) => {
    const undock = undockRef.current;
    if (!undock || undock.pointerId !== pointerId) return;
    undockRef.current = null;
    suppressDrawerClickRef.current = false;
    if (undock.captureTarget.hasPointerCapture(pointerId)) {
      undock.captureTarget.releasePointerCapture(pointerId);
    }
  }, []);
  const previewFloatingCard = useCallback(
    (card: ResolvedPinnedMediaCard) => {
      if (suppressFloatingClickRef.current) {
        suppressFloatingClickRef.current = false;
        return;
      }
      onPreview(card);
    },
    [onPreview],
  );
  const previewDockedCard = useCallback(
    (card: ResolvedPinnedMediaCard) => {
      if (suppressDrawerClickRef.current) {
        suppressDrawerClickRef.current = false;
        return;
      }
      onPreview(card);
    },
    [onPreview],
  );
  const linkedCard = linkedCardId ? (floatingCards.find((card) => card.id === linkedCardId) ?? null) : null;
  const linkedTarget = linkedCard && projectPlacePoint ? projectPlacePoint(linkedCard.place) : null;
  const linkedFrame = linkedCard ? (cardRects[linkedCard.id] ?? null) : null;
  const linkGeometry =
    linkedCard && linkedTarget && linkedFrame ? pinnedMediaConnectionGeometry(linkedFrame, linkedTarget) : null;
  const toggleMapLink = useCallback((id: string) => setLinkedCardId((current) => (current === id ? null : id)), []);

  return (
    <div className="pinned-media-board" aria-live="polite">
      {linkedCard && linkGeometry ? (
        <PinnedMediaMapLink geometry={linkGeometry} zIndex={linkedCard.layout.zIndex + 1} />
      ) : null}
      {floatingCards.map((card) => (
        <PinnedMediaCard
          key={card.id}
          card={card}
          cardRef={(element) => setCardElement(card.id, element)}
          isActive={activeCardId === card.id}
          isLinked={linkedCardId === card.id}
          onBringToFront={onBringToFront}
          onMediaSizeChange={onMediaSizeChange}
          onRemove={onRemove}
          onPreview={previewFloatingCard}
          onStartInteraction={startInteraction}
          onToggleMapLink={toggleMapLink}
        />
      ))}
      <PinnedMediaDrawer
          cards={dockedCards}
          recommendedItems={availableRecommendations}
          onSelectRecommendedPlace={onSelectRecommendedPlace}
          stage={drawerStage}
          isDragging={isDragging}
          isDropActive={isDropActive}
          onStageChange={onDrawerStageChange}
          onPreview={previewDockedCard}
          onRemove={onRemove}
          onStartUndock={startUndock}
          onCancelUndock={cancelUndock}
        />
      {notice ? (
        <div className="pinned-media-notice" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
