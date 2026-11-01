import type { PlaceMapItem } from "../../../api/types";
import { findPlaceGalleryItem } from "../placePreview";
import { clampPinnedMediaLayout, defaultPinnedMediaLayout, nextPinnedMediaZIndex } from "./pinnedMediaBoardLayout";
import {
  MAX_PINNED_MEDIA_CARDS,
  type PinMediaDraft,
  type PinMediaResult,
  type PinnedMediaBounds,
  type PinnedMediaLayout,
  type ResolvedPinnedMediaCard,
  type StoredPinnedMediaCard,
} from "./pinnedMediaBoardTypes";

function pinnedMediaCardId(placeId: string, kind: PinMediaDraft["kind"], itemId: string) {
  return `${placeId}:${kind}:${itemId}`;
}

export function upsertPinnedMediaCard(
  cards: StoredPinnedMediaCard[],
  draft: PinMediaDraft,
  bounds: PinnedMediaBounds,
): PinMediaResult {
  const id = pinnedMediaCardId(draft.placeId, draft.kind, draft.itemId);
  const currentCard = cards.find((card) => card.id === id);

  if (currentCard) {
    const cardsWithFreshSnapshot = draft.itemSnapshot
      ? cards.map((card) =>
          card.id === id
            ? {
                ...card,
                itemSnapshot: draft.itemSnapshot,
              }
            : card,
        )
      : cards;
    return {
      cards: bringPinnedMediaCardToFront(
        cardsWithFreshSnapshot.map((card) => (card.id === id ? { ...card, docked: false } : card)),
        id,
      ),
      status: "updated",
    };
  }

  if (cards.length >= MAX_PINNED_MEDIA_CARDS) {
    return { cards, status: "limit" };
  }

  return {
    cards: [
      ...cards,
      {
        createdAt: Date.now(),
        id,
        itemId: draft.itemId,
        ...(draft.itemSnapshot ? { itemSnapshot: draft.itemSnapshot } : {}),
        kind: draft.kind,
        layout: defaultPinnedMediaLayout({
          aspectRatio: draft.aspectRatio,
          bounds,
          existingCards: cards,
          sourceRect: draft.sourceRect,
        }),
        placeId: draft.placeId,
      },
    ],
    status: "added",
  };
}

export function bringPinnedMediaCardToFront(cards: StoredPinnedMediaCard[], id: string): StoredPinnedMediaCard[] {
  const zIndex = nextPinnedMediaZIndex(cards);

  return cards.map((card) =>
    card.id === id
      ? {
          ...card,
          layout: {
            ...card.layout,
            zIndex,
          },
        }
      : card,
  );
}

export function updatePinnedMediaDock(
  cards: StoredPinnedMediaCard[],
  id: string,
  docked: boolean,
): StoredPinnedMediaCard[] {
  return cards.map((card) => (card.id === id ? { ...card, docked } : card));
}

export function updatePinnedMediaLayout(
  cards: StoredPinnedMediaCard[],
  id: string,
  layout: PinnedMediaLayout,
  bounds: PinnedMediaBounds,
): StoredPinnedMediaCard[] {
  return cards.map((card) =>
    card.id === id
      ? {
          ...card,
          layout: clampPinnedMediaLayout(layout, bounds),
        }
      : card,
  );
}

export function resolvePinnedMediaCards(
  cards: StoredPinnedMediaCard[],
  places: PlaceMapItem[],
): ResolvedPinnedMediaCard[] {
  const placesById = new Map(places.map((place) => [place.id, place]));
  const resolvedCards: ResolvedPinnedMediaCard[] = [];

  for (const card of cards) {
    const place = placesById.get(card.placeId);
    const liveItem = place ? findPlaceGalleryItem(place, { id: card.itemId, kind: card.kind }) : null;
    const storedItem =
      card.itemSnapshot?.id === card.itemId && card.itemSnapshot.kind === card.kind ? card.itemSnapshot : null;
    const item = liveItem ?? storedItem;

    if (place && item) {
      resolvedCards.push({ ...card, item, itemSnapshot: item, place });
    }
  }

  return resolvedCards;
}

export function toStoredPinnedMediaCard(card: ResolvedPinnedMediaCard): StoredPinnedMediaCard {
  return {
    createdAt: card.createdAt,
    ...(card.docked ? { docked: true } : {}),
    id: card.id,
    itemId: card.itemId,
    itemSnapshot: card.item,
    kind: card.kind,
    layout: card.layout,
    placeId: card.placeId,
  };
}

export function pinnedMediaCardListsEqual(first: StoredPinnedMediaCard[], second: StoredPinnedMediaCard[]) {
  return JSON.stringify(first) === JSON.stringify(second);
}
