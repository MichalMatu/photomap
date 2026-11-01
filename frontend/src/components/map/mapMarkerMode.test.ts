import { describe, expect, it, vi } from "vitest";
import { MAP_MARKER_MODE_STORAGE_KEY, readMapMarkerMode, writeMapMarkerMode } from "./mapMarkerMode";

describe("map marker mode", () => {
  it("defaults to photo tiles when no preference exists", () => {
    expect(readMapMarkerMode({ getItem: () => null })).toBe("photos");
    expect(readMapMarkerMode({ getItem: () => "invalid" })).toBe("photos");
  });
  it("restores and saves the optional pin mode", () => {
    const setItem = vi.fn();
    expect(readMapMarkerMode({ getItem: () => "pins" })).toBe("pins");
    writeMapMarkerMode("photos", { setItem });
    expect(setItem).toHaveBeenCalledWith(MAP_MARKER_MODE_STORAGE_KEY, "photos");
  });
  it("fails safe when storage throws", () => {
    expect(
      readMapMarkerMode({
        getItem: () => {
          throw Error("blocked");
        },
      }),
    ).toBe("photos");
    expect(() =>
      writeMapMarkerMode("pins", {
        setItem: () => {
          throw Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});
