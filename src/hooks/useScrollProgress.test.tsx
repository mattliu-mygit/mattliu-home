import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScrollProgress } from "./useScrollProgress";

describe("useScrollProgress", () => {
  let nextFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 1500,
      configurable: true,
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns bounded document scroll progress", () => {
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current).toBe(0);

    Object.defineProperty(window, "scrollY", {
      value: 500,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
    act(() => nextFrame?.(0));

    expect(result.current).toBe(0.5);

    Object.defineProperty(window, "scrollY", {
      value: 2000,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
    act(() => nextFrame?.(16));

    expect(result.current).toBe(1);
  });
});
