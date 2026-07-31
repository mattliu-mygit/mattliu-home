import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteContent } from "../content/site-content";
import {
  createRouteChapters,
  createRouteMarks,
  createStoryBeats,
  routeMarkerPosition,
} from "../story-navigation";
import { RouteRail, type RouteRailHandle } from "./RouteRail";

const beats = createStoryBeats(siteContent);

afterEach(cleanup);

describe("RouteRail", () => {
  it("renders one instrument tick per beat with major route labels", () => {
    render(
      <RouteRail
        activeId="path"
        beats={beats}
        onSelect={() => undefined}
        initialProgress={3 / (beats.length - 1)}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(beats.length);
    expect(screen.getByRole("button", { name: "Go to Origin" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go to Path" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("button", { name: "Go to Projects" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go to Quotes" })).toBeVisible();
  });

  it("requests navigation without activating project content", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <RouteRail
        activeId="intro/name"
        beats={beats}
        onSelect={onSelect}
        initialProgress={0}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Go to Monopole" }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "projects/monopole" }),
    );
  });

  it("positions its scrollbar marker at the active beat", () => {
    render(
      <RouteRail
        activeId="path/aws-sagemaker"
        beats={beats}
        onSelect={() => undefined}
        initialProgress={0.25}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Story scrollbar" }),
    ).toHaveStyle({
      "--route-progress": "26.190476190476193%",
    });
  });

  it("updates continuous progress without a React render", () => {
    const ref = createRef<RouteRailHandle>();
    render(
      <RouteRail
        activeId="intro/name"
        beats={beats}
        onSelect={() => undefined}
        initialProgress={0}
        ref={ref}
      />,
    );

    act(() => ref.current?.setProgress(0.75));

    expect(
      screen.getByRole("navigation", { name: "Story scrollbar" }),
    ).toHaveStyle({
      "--route-progress": "73.80952380952381%",
    });
  });

  it("renders chapter labels at their opening ticks and Fin at the final tick", () => {
    const { container } = render(
      <RouteRail
        activeId="intro/name"
        beats={beats}
        initialProgress={0}
        onSelect={() => undefined}
      />,
    );

    const layer = container.querySelector(".route-rail__chapters");
    const labels = Array.from(
      container.querySelectorAll<HTMLElement>(".route-rail__chapter"),
    );
    const chapters = createRouteChapters(beats);
    const marks = createRouteMarks(beats);

    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(labels.map((label) => label.textContent)).toEqual(
      chapters.map(({ label }) => label),
    );
    labels.forEach((label, index) => {
      expect(label.style.getPropertyValue("--chapter-position")).toBe(
        `${chapters[index].position}%`,
      );
    });
    expect(chapters).toEqual([
      { label: "Intro", position: routeMarkerPosition(0, beats.length) },
      { label: "Path", position: routeMarkerPosition(3 / 20, beats.length) },
      {
        label: "Projects",
        position: routeMarkerPosition(7 / 20, beats.length),
      },
      {
        label: "Quotes",
        position: routeMarkerPosition(13 / 20, beats.length),
      },
      { label: "Fin", position: routeMarkerPosition(1, beats.length) },
    ]);
    chapters.forEach((chapter, index) => {
      const openingIndex = [0, 3, 7, 13, 20][index];
      if (chapter.label !== "Fin") {
        expect(marks[openingIndex]?.major).toBe(true);
      }
      expect(chapter.position).toBe(
        routeMarkerPosition(openingIndex / (beats.length - 1), beats.length),
      );
    });
  });
});
