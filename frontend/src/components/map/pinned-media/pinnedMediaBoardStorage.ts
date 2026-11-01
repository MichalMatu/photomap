import type { AudioAttachment } from "../../../api/types";
import type { PlaceMapVisualItem } from "../placePreview";
import {
  MAX_PINNED_MEDIA_CARDS,
  type PinnedMediaLayout,
  type StorageLike,
  type StoredPinnedMediaCard,
} from "./pinnedMediaBoardTypes";

export const PINNED_MEDIA_STORAGE_KEY = "photomap:pinned-media-board:v1";

type StoredPayload = {
  cards: StoredPinnedMediaCard[];
  version: 1;
};

type PinnedPhotoSnapshot = Extract<PlaceMapVisualItem, { kind: "photo" }>;

export function readPinnedMediaCards(storage: StorageLike | null = getLocalStorage()): StoredPinnedMediaCard[] {
  if (!storage) {
    return [];
  }

  try {
    const parsed = JSON.parse(storage.getItem(PINNED_MEDIA_STORAGE_KEY) ?? "null") as Partial<StoredPayload> | null;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cards)) {
      return [];
    }

    return parsed.cards.filter(isStoredPinnedMediaCard).slice(0, MAX_PINNED_MEDIA_CARDS);
  } catch {
    return [];
  }
}

export function writePinnedMediaCards(cards: StoredPinnedMediaCard[], storage: StorageLike | null = getLocalStorage()) {
  if (!storage) {
    return;
  }

  try {
    if (cards.length === 0) {
      storage.removeItem(PINNED_MEDIA_STORAGE_KEY);
      return;
    }

    storage.setItem(
      PINNED_MEDIA_STORAGE_KEY,
      JSON.stringify({
        cards: cards.slice(0, MAX_PINNED_MEDIA_CARDS),
        version: 1,
      } satisfies StoredPayload),
    );
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

function isStoredPinnedMediaCard(value: unknown): value is StoredPinnedMediaCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Partial<StoredPinnedMediaCard>;
  return (
    typeof card.id === "string" &&
    typeof card.placeId === "string" &&
    typeof card.itemId === "string" &&
    (card.kind === "photo" || card.kind === "memory") &&
    Number.isFinite(card.createdAt) &&
    isPinnedMediaLayout(card.layout) &&
    (card.docked === undefined || typeof card.docked === "boolean") &&
    (card.itemSnapshot === undefined || isPinnedMediaItemSnapshot(card.itemSnapshot, card.kind, card.itemId))
  );
}

function isPinnedMediaItemSnapshot(
  value: unknown,
  kind: "photo" | "memory",
  itemId: string,
): value is PlaceMapVisualItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<PlaceMapVisualItem>;
  if (
    item.id !== itemId ||
    item.kind !== kind ||
    !isNullableString(item.caption) ||
    typeof item.public_path !== "string" ||
    typeof item.thumb_path !== "string" ||
    !isAudioAttachment(item.audio)
  ) {
    return false;
  }

  if (item.kind === "memory") {
    return true;
  }

  const photo = item as Partial<PinnedPhotoSnapshot>;
  return (
    isNullableString(photo.attribution_author) &&
    isNullableString(photo.attribution_source_url) &&
    isNullableString(photo.attribution_license) &&
    isNullableString(photo.attribution_license_url)
  );
}

function isAudioAttachment(value: unknown): value is AudioAttachment | null {
  if (value === null) {
    return true;
  }
  if (!value || typeof value !== "object") {
    return false;
  }

  const audio = value as Partial<AudioAttachment>;
  return (
    typeof audio.public_path === "string" &&
    typeof audio.mime_type === "string" &&
    Number.isFinite(audio.size_bytes) &&
    Number.isFinite(audio.duration_seconds)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPinnedMediaLayout(value: unknown): value is PinnedMediaLayout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const layout = value as Partial<PinnedMediaLayout>;
  return (
    (layout.captionHidden === undefined || typeof layout.captionHidden === "boolean") &&
    Number.isFinite(layout.aspectRatio) &&
    Number.isFinite(layout.height) &&
    Number.isFinite(layout.width) &&
    Number.isFinite(layout.x) &&
    Number.isFinite(layout.y) &&
    Number.isFinite(layout.zIndex)
  );
}

function getLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}
