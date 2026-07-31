import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CelestialMotionProvider,
  createCelestialMotionChannel,
} from "../celestial-motion-channel";
import { projectConstellationPoint } from "../celestial-motion";
import { ConstellationMap } from "./ConstellationMap";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ConstellationMap motion", () => {
  it("projects stars and lines from the shared celestial frame without its own loop", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    const channel = createCelestialMotionChannel();
    const items = [
      {
        slug: "first",
        label: "First",
        meta: "One",
        position: [14, 58] as const,
        depth: 1.1,
      },
      {
        slug: "second",
        label: "Second",
        meta: "Two",
        position: [29, 29] as const,
        depth: 0.9,
      },
    ];

    render(
      <CelestialMotionProvider value={channel}>
        <main className="universe">
          <ConstellationMap
            activeSlug="first"
            connections={[["first", "second"]]}
            getAccessibleName={(item) => item.label}
            items={items}
            kind="path"
            onSelect={() => undefined}
          />
        </main>
      </CelestialMotionProvider>,
    );

    act(() => channel.publish({ x: 10, y: 6 }));

    const first = projectConstellationPoint(
      items[0].position,
      items[0].depth,
      { x: 10, y: 6 },
      { width: 1000, height: 600 },
    );
    const second = projectConstellationPoint(
      items[1].position,
      items[1].depth,
      { x: 10, y: 6 },
      { width: 1000, height: 600 },
    );
    const firstStar = screen.getByRole("button", { name: "First" });
    const secondStar = screen.getByRole("button", { name: "Second" });
    const line = document.querySelector("line");

    expect(firstStar.style.getPropertyValue("--star-x")).toBe(`${first[0]}%`);
    expect(firstStar.style.getPropertyValue("--star-y")).toBe(`${first[1]}%`);
    expect(secondStar.style.getPropertyValue("--star-x")).toBe(`${second[0]}%`);
    expect(secondStar.style.getPropertyValue("--star-y")).toBe(`${second[1]}%`);
    expect(line).toHaveAttribute("x1", String(first[0]));
    expect(line).toHaveAttribute("y1", String(first[1]));
    expect(line).toHaveAttribute("x2", String(second[0]));
    expect(line).toHaveAttribute("y2", String(second[1]));
    expect(requestFrame).not.toHaveBeenCalled();
  });
});
