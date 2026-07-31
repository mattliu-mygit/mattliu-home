import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteContent } from "../content/site-content";
import { createStoryBeats } from "../story-navigation";
import {
  NarrativeWheel,
  type NarrativeWheelHandle,
} from "./NarrativeWheel";

const beats = createStoryBeats(siteContent);

afterEach(cleanup);

describe("NarrativeWheel", () => {
  const makeScrollable = (element: HTMLElement, scrollTop = 300) => {
    Object.defineProperties(element, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1_200 },
      scrollTop: { configurable: true, writable: true, value: scrollTop },
    });
  };

  it("introduces Matthew line by line before the Path cards", () => {
    render(
      <NarrativeWheel
        activeId="intro/name"
        beats={beats}
        collapsed={false}
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Matthew Liu" })).toBeVisible();
    expect(screen.getByText(/keep intelligent software/i)).toBeVisible();
    expect(screen.getByText(/turn ideas and research/i)).toBeVisible();
    expect(screen.getByText("AWS SageMaker")).toBeVisible();
  });

  it("activates a project card explicitly", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <NarrativeWheel
        activeId="projects/ucredit"
        beats={beats}
        collapsed={false}
        onActivate={onActivate}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open Monopole" }));
    expect(onActivate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "projects/monopole", kind: "project" }),
    );
  });

  it("settles a requested landmark before applying open-sky wheel input", () => {
    const ref = createRef<NarrativeWheelHandle>();
    const scrollIntoView = vi.fn();
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    HTMLElement.prototype.scrollBy = scrollBy;

    render(
      <NarrativeWheel
        activeId="intro/name"
        beats={beats}
        collapsed={false}
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
        ref={ref}
      />,
    );

    scrollIntoView.mockClear();
    ref.current?.scrollToBeat("path/aws-sagemaker", "auto");
    makeScrollable(screen.getByLabelText("Story sequence"));
    ref.current?.scrollBy({ deltaY: 160, deltaMode: 0 });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 120 });
  });

  it("applies identical narrative motion over cards and open sky", () => {
    const ref = createRef<NarrativeWheelHandle>();
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy;

    render(
      <NarrativeWheel
        activeId="intro/name"
        beats={beats}
        collapsed={false}
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
        ref={ref}
      />,
    );

    const scroll = screen.getByLabelText("Story sequence");
    makeScrollable(scroll);
    fireEvent.wheel(scroll, { deltaY: 48, deltaMode: 0 });
    ref.current?.scrollBy({ deltaY: 48, deltaMode: 0 });

    expect(scrollBy).toHaveBeenNthCalledWith(1, {
      behavior: "auto",
      top: 48,
    });
    expect(scrollBy).toHaveBeenNthCalledWith(2, {
      behavior: "auto",
      top: 48,
    });
  });

  it("normalizes wheel units and releases outward input at boundaries", () => {
    const ref = createRef<NarrativeWheelHandle>();
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy;

    render(
      <NarrativeWheel
        activeId="intro/name"
        beats={beats}
        collapsed={false}
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
        ref={ref}
      />,
    );

    const scroll = screen.getByLabelText("Story sequence");
    makeScrollable(scroll, 0);
    ref.current?.scrollBy({ deltaY: -2, deltaMode: 1 });
    ref.current?.scrollBy({ deltaY: 2, deltaMode: 1 });

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 32 });
  });
});
