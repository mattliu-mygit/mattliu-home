import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  type CelestialMotionChannel,
  useCelestialMotionChannel,
} from "../celestial-motion-channel";
import { CelestialScene } from "./CelestialScene";

afterEach(cleanup);

describe("CelestialScene motion ownership", () => {
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
        cameraOrigin={[50, 50]}
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
