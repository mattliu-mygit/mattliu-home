import { afterEach, describe, expect, it, vi } from "vitest";

import { runViewTransition } from "./view-transition";

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
});

describe("runViewTransition", () => {
  it("runs the update inside a supported view transition", () => {
    const update = vi.fn();
    const finished = Promise.resolve();
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return { finished };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });

    expect(runViewTransition(document, update, true)).toEqual({ finished });
    expect(startViewTransition).toHaveBeenCalledWith(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("updates synchronously when the API is unavailable", () => {
    const update = vi.fn();

    expect(runViewTransition(document, update, true)).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("bypasses the API when transitions are disabled", () => {
    const update = vi.fn();
    const startViewTransition = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });

    expect(runViewTransition(document, update, false)).toBeNull();
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
