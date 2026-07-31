import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type CelestialMotionChannel,
  useCelestialMotionChannel,
} from "../celestial-motion-channel";
import { CelestialScene } from "./CelestialScene";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CelestialScene motion ownership", () => {
  it("draws one varied static field when reduced motion is requested", () => {
    const arc = vi.fn();
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      arc,
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    render(
      <CelestialScene
        camera={{ focused: false, origin: { x: 50, y: 50 }, scale: 1 }}
        constellationDirection={{ x: 1, y: 1 }}
        interactive
        view="universe"
      />,
    );

    expect(arc).toHaveBeenCalled();
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("clears the previous view pull before the next view paints", () => {
    const channelRef: { current: CelestialMotionChannel | null } = {
      current: null,
    };
    const Probe = () => {
      channelRef.current = useCelestialMotionChannel();
      return null;
    };
    const renderScene = (view: "universe" | "projects") => (
      <CelestialScene
        camera={{
          focused: view !== "universe",
          origin: { x: 50, y: 50 },
          scale: view === "universe" ? 1 : 3.4,
        }}
        constellationDirection={{ x: 1, y: 1 }}
        interactive
        view={view}
      >
        <Probe />
      </CelestialScene>
    );
    const { rerender } = render(renderScene("universe"));
    const universe = screen.getByRole("main");
    const channel = channelRef.current;
    if (!channel) {
      throw new Error("Celestial motion channel was not provided");
    }

    act(() => {
      universe.style.setProperty("--constellation-pull-x", "10px");
      universe.style.setProperty("--constellation-pull-y", "4px");
      channel.publish({ x: 10, y: 4 });
    });
    rerender(renderScene("projects"));

    expect(channel.current()).toEqual({ x: 0, y: 0 });
    expect(universe.style.getPropertyValue("--constellation-pull-x")).toBe(
      "0px",
    );
    expect(universe.style.getPropertyValue("--constellation-pull-y")).toBe(
      "0px",
    );
  });
});
