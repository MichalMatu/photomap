import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PlaceMapItem } from "../../../api/types";
import {
  bringPinnedMediaCardToFront,
  pinnedMediaCardListsEqual,
  resolvePinnedMediaCards,
  toStoredPinnedMediaCard,
  updatePinnedMediaLayout,
  updatePinnedMediaDock,
  upsertPinnedMediaCard,
} from "./pinnedMediaBoardCards";
import { clampPinnedMediaLayout, getPinnedMediaBounds, safeAspectRatio } from "./pinnedMediaBoardLayout";
import { readPinnedMediaCards, writePinnedMediaCards } from "./pinnedMediaBoardStorage";
import type {
  PinnedMediaLayout,
  PinnedMediaNaturalSize,
  RectLike,
  ResolvedPinnedMediaCard,
  StoredPinnedMediaCard,
} from "./pinnedMediaBoardTypes";
import type { PlaceMapVisualItem } from "../placePreview";

export type PinMediaRequest = {
  aspectRatio?: number | null;
  item: PlaceMapVisualItem;
  place: PlaceMapItem;
  sourceRect?: RectLike | null;
};

type UsePinnedMediaBoardResult = {
  cards: ResolvedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onDock: (id: string) => void;
  onUndock: (id: string) => void;
  onLayoutChange: (id: string, layout: PinnedMediaLayout) => void;
  onMediaSizeChange: (id: string, naturalSize: PinnedMediaNaturalSize) => void;
  onRemove: (id: string) => void;
  pinMedia: (request: PinMediaRequest) => boolean;
};

export function usePinnedMediaBoard(places: PlaceMapItem[]): UsePinnedMediaBoardResult {
  const [storedCards, setStoredCards] = useState<StoredPinnedMediaCard[]>(() => readPinnedMediaCards());
  const [notice, setNotice] = useState<string | null>(null);
  const cardsRef = useRef(storedCards);

  useEffect(() => {
    cardsRef.current = storedCards;
    writePinnedMediaCards(storedCards);
  }, [storedCards]);

  useEffect(() => {
    if (places.length === 0) {
      return;
    }

    setStoredCards((currentCards) => {
      const bounds = getPinnedMediaBounds();
      const resolvedCards = resolvePinnedMediaCards(currentCards, places).map((card) =>
        toStoredPinnedMediaCard({
          ...card,
          layout: clampPinnedMediaLayout(card.layout, bounds),
        }),
      );
      if (pinnedMediaCardListsEqual(currentCards, resolvedCards)) {
        return currentCards;
      }

      cardsRef.current = resolvedCards;
      return resolvedCards;
    });
  }, [places]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  useEffect(() => {
    let frameId: number | null = null;

    const handleResize = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const bounds = getPinnedMediaBounds();
        setStoredCards((currentCards) => {
          const nextCards = currentCards.map((card) => ({
            ...card,
            layout: clampPinnedMediaLayout(card.layout, bounds),
          }));

          if (pinnedMediaCardListsEqual(currentCards, nextCards)) {
            return currentCards;
          }

          cardsRef.current = nextCards;
          return nextCards;
        });
      });
    };

    window.addEventListener("resize", handleResize);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleResize);
    const mapElement = document.querySelector(".place-map");
    if (mapElement) resizeObserver?.observe(mapElement);

    return () => {
      resizeObserver?.disconnect();
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const resolvedCards = useMemo(() => resolvePinnedMediaCards(storedCards, places), [places, storedCards]);

  const pinMedia = useCallback((request: PinMediaRequest) => {
    const result = upsertPinnedMediaCard(
      cardsRef.current,
      {
        aspectRatio: request.aspectRatio,
        itemId: request.item.id,
        itemSnapshot: request.item,
        kind: request.item.kind,
        placeId: request.place.id,
        sourceRect: request.sourceRect,
      },
      getPinnedMediaBounds(),
    );

    if (result.status === "limit") {
      setNotice("Limit 8 przypiętych zdjęć.");
      return false;
    }

    cardsRef.current = result.cards;
    setStoredCards(result.cards);
    setNotice(null);
    return true;
  }, []);

  const onLayoutChange = useCallback((id: string, layout: PinnedMediaLayout) => {
    setStoredCards((currentCards) => {
      const nextCards = updatePinnedMediaLayout(currentCards, id, layout, getPinnedMediaBounds());
      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  const onMediaSizeChange = useCallback((id: string, naturalSize: PinnedMediaNaturalSize) => {
    if (
      !Number.isFinite(naturalSize.width) ||
      !Number.isFinite(naturalSize.height) ||
      naturalSize.width <= 0 ||
      naturalSize.height <= 0
    ) {
      return;
    }

    const normalizedSize = {
      height: Math.round(naturalSize.height),
      width: Math.round(naturalSize.width),
    };

    setStoredCards((currentCards) => {
      const bounds = getPinnedMediaBounds();
      const nextCards = currentCards.map((card) =>
        card.id === id
          ? {
              ...card,
              layout: clampPinnedMediaLayout(
                {
                  ...card.layout,
                  aspectRatio: safeAspectRatio(normalizedSize.width / normalizedSize.height),
                },
                bounds,
              ),
            }
          : card,
      );

      if (pinnedMediaCardListsEqual(currentCards, nextCards)) {
        return currentCards;
      }

      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  const onBringToFront = useCallback((id: string) => {
    setStoredCards((currentCards) => {
      const nextCards = bringPinnedMediaCardToFront(currentCards, id);
      if (pinnedMediaCardListsEqual(currentCards, nextCards)) {
        return currentCards;
      }

      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  const onDock = useCallback((id: string) => {
    setStoredCards((currentCards) => {
      const nextCards = updatePinnedMediaDock(currentCards, id, true);
      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  const onUndock = useCallback((id: string) => {
    setStoredCards((currentCards) => {
      const nextCards = updatePinnedMediaDock(currentCards, id, false);
      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  const onRemove = useCallback((id: string) => {
    setStoredCards((currentCards) => {
      const nextCards = currentCards.filter((card) => card.id !== id);
      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  return {
    cards: resolvedCards,
    notice,
    onBringToFront,
    onDock,
    onUndock,
    onLayoutChange,
    onMediaSizeChange,
    onRemove,
    pinMedia,
  };
}
