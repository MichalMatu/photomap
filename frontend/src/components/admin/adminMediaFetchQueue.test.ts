import { describe, expect, it, vi } from "vitest";

import { enqueueAdminMediaFetch } from "./adminMediaFetchQueue";

describe("admin media fetch queue", () => {
  it("never has more than three active image downloads", async () => {
    const releases: Array<() => void> = [];
    let active = 0;
    let maxActive = 0;

    const requests = Array.from({ length: 9 }, () =>
      enqueueAdminMediaFetch(
        () =>
          new Promise<Blob>((resolve) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            releases.push(() => {
              active -= 1;
              resolve(new Blob(["ok"]));
            });
          }),
      ),
    );

    for (let index = 0; index < 9; index += 1) {
      await vi.waitFor(() => expect(releases.length).toBeGreaterThan(index));
      releases[index]();
    }

    await Promise.all(requests);
    expect(maxActive).toBe(3);
  });

  it("drops queued downloads that are no longer visible", async () => {
    const release: Array<() => void> = [];
    const active = Array.from({ length: 3 }, () =>
      enqueueAdminMediaFetch(
        () =>
          new Promise<Blob>((resolve) => {
            release.push(() => resolve(new Blob(["active"])));
          }),
      ),
    );
    await vi.waitFor(() => expect(release).toHaveLength(3));
    const controller = new AbortController();
    const notStarted = vi.fn(async () => new Blob(["not started"]));
    const cancelled = enqueueAdminMediaFetch(notStarted, controller.signal);
    controller.abort();

    await expect(cancelled).rejects.toThrow("cancelled");
    for (const complete of release) {
      complete();
    }
    await Promise.all(active);
    expect(notStarted).not.toHaveBeenCalled();
  });
});
