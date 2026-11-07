import { getAdminSessionToken } from "./auth";

const DEFAULT_API_BASE_URL = import.meta.env.PROD ? "" : "http://127.0.0.1:8000";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
const MEDIA_CACHE_REVISION_STORAGE_KEY = "photomap_media_cache_revision";
let lastMediaCacheRevisionMillis = 0;

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (requestId) {
      this.requestId = requestId;
    }
  }
}

export function apiRequestIdFromBody(body: string): string | undefined {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmedBody) as { request_id?: unknown };
    return typeof parsed.request_id === "string" && parsed.request_id.trim() ? parsed.request_id.trim() : undefined;
  } catch {
    return undefined;
  }
}

export function apiErrorMessageFromBody(body: string, fallback: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmedBody) as { detail?: unknown; message?: unknown };
    const detail = parsed.detail ?? parsed.message;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const record = item as { loc?: unknown; msg?: unknown };
          const message = typeof record.msg === "string" ? record.msg : null;
          if (!message) {
            return null;
          }
          const location = Array.isArray(record.loc) ? record.loc.join(".") : null;
          return location ? `${location}: ${message}` : message;
        })
        .filter((message): message is string => Boolean(message));
      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
  } catch {
    return trimmedBody;
  }

  return fallback;
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (path.startsWith("/api/admin")) {
    const token = getAdminSessionToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(`Backend API nie odpowiada pod ${API_BASE_URL}. Uruchom ./scripts/dev_backend.sh.`, 0);
  }

  if (!response.ok) {
    const body = await response.text();
    const requestId = response.headers.get("X-Request-ID") ?? apiRequestIdFromBody(body);
    if (response.status === 401) {
      throw new ApiError("Token admina jest nieprawidłowy.", response.status, requestId ?? undefined);
    }
    if (response.status === 503) {
      throw new ApiError("Token admina nie jest skonfigurowany w backendzie.", response.status, requestId ?? undefined);
    }
    throw new ApiError(
      apiErrorMessageFromBody(body, `Request failed: ${response.status}`),
      response.status,
      requestId ?? undefined,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function requestBlob(path: string, options?: RequestInit): Promise<Blob> {
  const headers = new Headers(options?.headers);
  if (path.startsWith("/api/admin")) {
    const token = getAdminSessionToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(`Backend API nie odpowiada pod ${API_BASE_URL}. Uruchom ./scripts/dev_backend.sh.`, 0);
  }

  if (!response.ok) {
    const body = await response.text();
    const requestId = response.headers.get("X-Request-ID") ?? apiRequestIdFromBody(body);
    throw new ApiError(
      apiErrorMessageFromBody(body, `Request failed: ${response.status}`),
      response.status,
      requestId ?? undefined,
    );
  }

  return response.blob();
}

function getMediaCacheRevision(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return "";
  }

  try {
    return window.localStorage.getItem(MEDIA_CACHE_REVISION_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function bumpMediaCacheRevision(): string {
  lastMediaCacheRevisionMillis = Math.max(Date.now(), lastMediaCacheRevisionMillis + 1);
  const revision = lastMediaCacheRevisionMillis.toString(36);
  if (typeof window === "undefined" || !window.localStorage) {
    return revision;
  }

  try {
    window.localStorage.setItem(MEDIA_CACHE_REVISION_STORAGE_KEY, revision);
  } catch {
    return revision;
  }
  return revision;
}

export function mediaUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  const url = `${API_BASE_URL}${path}`;
  const revision = getMediaCacheRevision();
  if (!revision) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(revision)}`;
}
