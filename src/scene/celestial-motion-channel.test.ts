import { describe, expect, it, vi } from "vitest";

import { createCelestialMotionChannel } from "./celestial-motion-channel";

describe("celestial motion channel", () => {
  it("publishes only meaningful motion and immediately initializes subscribers", () => {
    const channel = createCelestialMotionChannel();
    const listener = vi.fn();
    const unsubscribe = channel.subscribe(listener);

    expect(listener).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    channel.publish({ x: 10, y: 4 });
    channel.publish({ x: 10.005, y: 4.004 });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(channel.current()).toEqual({ x: 10, y: 4 });

    channel.publish({ x: 0.004, y: -0.004 });
    expect(listener).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    unsubscribe();
    channel.publish({ x: -5, y: 2 });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
