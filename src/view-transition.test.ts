import { afterEach, describe, expect, it, vi } from "vitest";

import { runViewTransition } from "./view-transition";

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
  delete document.documentElement.dataset.viewTransitionTarget;
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

  it("scopes both snapshots to one target until the transition finishes", async () => {
    let finishTransition: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
      finishTransition = resolve;
    });
    const update = vi.fn();
    const startViewTransition = vi.fn((callback: () => void) => {
      expect(document.documentElement.dataset.viewTransitionTarget).toBe(
        "projects",
      );
      callback();
      return { finished };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });

    runViewTransition(document, update, true, "projects");

    expect(document.documentElement.dataset.viewTransitionTarget).toBe(
      "projects",
    );
    finishTransition();
    await finished;
    await Promise.resolve();
    expect(
      document.documentElement.dataset.viewTransitionTarget,
    ).toBeUndefined();
  });

  it("cleans up a target when the transition rejects", async () => {
    let rejectTransition: (reason: Error) => void = () => undefined;
    const finished = new Promise<void>((_resolve, reject) => {
      rejectTransition = reject;
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (update: () => void) => {
        update();
        return { finished };
      },
    });

    runViewTransition(document, () => undefined, true, "quotes");
    expect(document.documentElement.dataset.viewTransitionTarget).toBe(
      "quotes",
    );
    rejectTransition(new Error("interrupted"));
    await finished.catch(() => undefined);
    await Promise.resolve();

    expect(
      document.documentElement.dataset.viewTransitionTarget,
    ).toBeUndefined();
  });

  it("does not let an older transition clean up a newer matching target", async () => {
    const finishes: Array<() => void> = [];
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (update: () => void) => {
        update();
        return {
          finished: new Promise<void>((resolve) => finishes.push(resolve)),
        };
      },
    });

    runViewTransition(document, () => undefined, true, "projects");
    runViewTransition(document, () => undefined, true, "projects");

    finishes[0]();
    await Promise.resolve();
    expect(document.documentElement.dataset.viewTransitionTarget).toBe(
      "projects",
    );

    finishes[1]();
    await Promise.resolve();
    expect(
      document.documentElement.dataset.viewTransitionTarget,
    ).toBeUndefined();
  });
});
