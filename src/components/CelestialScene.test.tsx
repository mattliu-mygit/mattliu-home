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
    const addColorStop = vi.fn();
    const createRadialGradient = vi.fn(() => ({ addColorStop }));
    const fillStyles: string[] = [];
    const shadowBlurs: number[] = [];
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const context = {
      arc,
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      createRadialGradient,
      fill: vi.fn(),
      set fillStyle(value: string | CanvasGradient | CanvasPattern) {
        if (typeof value === "string") {
          fillStyles.push(value);
        }
      },
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      setTransform: vi.fn(),
      set shadowBlur(value: number) {
        shadowBlurs.push(value);
      },
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );

    render(
      <CelestialScene
        camera={{ focused: false, origin: { x: 50, y: 50 }, scale: 1 }}
        constellationDirection={{ x: 1, y: 1 }}
        immersive={false}
        interactive
        view="universe"
      />,
    );

    expect(arc).toHaveBeenCalled();
    expect(createRadialGradient).toHaveBeenCalled();
    expect(addColorStop).toHaveBeenCalled();
    expect(Math.max(...shadowBlurs)).toBeLessThanOrEqual(6);
    const renderedAlphas = fillStyles.flatMap((style) => {
      const match = style.match(/rgba\([^,]+,[^,]+,[^,]+,([\d.]+)\)/);
      return match ? [Number(match[1])] : [];
    });
    expect(Math.max(...renderedAlphas)).toBeLessThanOrEqual(0.72);
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("keeps the previous view pull until the animation publishes the next frame", () => {
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
        immersive={false}
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

    expect(channel.current()).toEqual({ x: 10, y: 4 });
    expect(universe.style.getPropertyValue("--constellation-pull-x")).toBe(
      "10px",
    );
    expect(universe.style.getPropertyValue("--constellation-pull-y")).toBe(
      "4px",
    );
  });

  it("draws the immersive stellar band in the same reduced-motion canvas", () => {
    const arc = vi.fn();
    const createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
    const context = {
      arc,
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      createLinearGradient,
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fill: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );

    const scene = (immersive: boolean) => (
      <CelestialScene
        camera={{ focused: false, origin: { x: 50, y: 50 }, scale: 1 }}
        constellationDirection={{ x: 1, y: 1 }}
        immersive={immersive}
        interactive={!immersive}
        view="universe"
      />
    );
    const { rerender } = render(scene(false));
    const universeArcCount = arc.mock.calls.length;
    expect(createLinearGradient).not.toHaveBeenCalled();

    rerender(scene(true));

    expect(arc.mock.calls.length).toBeGreaterThan(universeArcCount + 200);
    expect(createLinearGradient).toHaveBeenCalled();
  });

  it("uses immersive wheel input for sky motion without navigating the story", () => {
    const onOpenSkyWheel = vi.fn();
    render(
      <CelestialScene
        camera={{ focused: false, origin: { x: 50, y: 50 }, scale: 1 }}
        constellationDirection={{ x: 1, y: 1 }}
        immersive
        interactive={false}
        onOpenSkyWheel={onOpenSkyWheel}
        view="universe"
      />,
    );
    const wheel = new WheelEvent("wheel", {
      cancelable: true,
      deltaY: 80,
    });

    window.dispatchEvent(wheel);

    expect(wheel.defaultPrevented).toBe(true);
    expect(onOpenSkyWheel).not.toHaveBeenCalled();
  });
});
