import { requestBlob } from "../../api/http";

// One admin gallery can contain hundreds of images. Bound the number of
// authenticated fetches regardless of how many components mount at once.
const MAX_CONCURRENT_MEDIA_FETCHES = 3;

type QueuedRequest = {
  run: () => Promise<Blob>;
  resolve: (value: Blob) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  onAbort: () => void;
};

const waiting: QueuedRequest[] = [];
let running = 0;

function abortError(): Error {
  return new Error("Admin media request cancelled");
}

function drain(): void {
  while (running < MAX_CONCURRENT_MEDIA_FETCHES && waiting.length > 0) {
    const item = waiting.shift()!;
    item.signal?.removeEventListener("abort", item.onAbort);
    if (item.signal?.aborted) {
      item.reject(abortError());
      continue;
    }

    running += 1;
    Promise.resolve()
      .then(item.run)
      .then(item.resolve, item.reject)
      .finally(() => {
        running -= 1;
        drain();
      });
  }
}

export function enqueueAdminMediaFetch(
  run: () => Promise<Blob>,
  signal?: AbortSignal,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const item: QueuedRequest = {
      run,
      resolve,
      reject,
      signal,
      onAbort: () => {
        const index = waiting.indexOf(item);
        if (index >= 0) {
          waiting.splice(index, 1);
          reject(abortError());
        }
      },
    };
    signal?.addEventListener("abort", item.onAbort, { once: true });
    waiting.push(item);
    drain();
  });
}

export function requestAdminImageBlob(path: string, signal: AbortSignal): Promise<Blob> {
  return enqueueAdminMediaFetch(() => requestBlob(path, { signal }), signal);
}
