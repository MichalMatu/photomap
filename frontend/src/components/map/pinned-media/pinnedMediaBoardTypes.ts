import type { PlaceMapItem } from "../../../api/types";
import type { PlaceMapVisualItem } from "../placePreview";

export const MAX_PINNED_MEDIA_CARDS = 8;

type PinnedMediaKind = PlaceMapVisualItem["kind"];

export type PinnedMediaBounds = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type RectLike = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type PinnedMediaLayout = {
  aspectRatio: number;
  captionHidden?: boolean;
  height: number;
  width: number;
  x: number;
  y: number;
  zIndex: number;
};

export type PinnedMediaNaturalSize = {
  height: number;
  width: number;
};

export type PinnedMediaPoint = {
  x: number;
  y: number;
};

export type StoredPinnedMediaCard = {
  createdAt: number;
  docked?: boolean;
  id: string;
  itemId: string;
  itemSnapshot?: PlaceMapVisualItem;
  kind: PinnedMediaKind;
  layout: PinnedMediaLayout;
  placeId: string;
};

export type ResolvedPinnedMediaCard = StoredPinnedMediaCard & {
  item: PlaceMapVisualItem;
  place: PlaceMapItem;
};

export type PinMediaDraft = {
  aspectRatio?: number | null;
  itemId: string;
  itemSnapshot?: PlaceMapVisualItem;
  kind: PinnedMediaKind;
  placeId: string;
  sourceRect?: RectLike | null;
};

export type PinMediaResult =
  | { cards: StoredPinnedMediaCard[]; status: "added" | "updated" }
  | { cards: StoredPinnedMediaCard[]; status: "limit" };

export type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;
