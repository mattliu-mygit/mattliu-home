import { createRef, type ComponentProps, type RefObject } from "react";
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

const renderWheel = (
  overrides: Partial<ComponentProps<typeof NarrativeWheel>> = {},
  ref?: RefObject<NarrativeWheelHandle | null>,
) =>
  render(
    <NarrativeWheel
      activeId="intro/name"
      beats={beats}
      onActivate={() => undefined}
      onActiveBeat={() => undefined}
      onProgressChange={() => undefined}
      ref={ref}
      {...overrides}
    />,
  );

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
    renderWheel();

    expect(screen.getByRole("img", { name: "Matthew Liu" })).toHaveAttribute(
      "src",
      "/matthew-liu.png",
    );
    expect(screen.getByRole("heading", { name: "Matthew Liu" })).toBeVisible();
    expect(screen.getByText(/keep intelligent software/i)).toBeVisible();
    expect(screen.getByText(/turn ideas and research/i)).toBeVisible();
    expect(screen.getByText("AWS SageMaker")).toBeVisible();
  });

  it("places ordered decorative brand marks after each Path title", () => {
    const { container } = renderWheel();

    const awsHeading = screen.getByRole("heading", { name: "AWS SageMaker" });
    const awsMarks = Array.from(
      awsHeading.querySelectorAll<HTMLImageElement>("[data-path-brand-mark]"),
    );

    expect(
      awsHeading.querySelector(".narrative-card__heading-text"),
    ).toHaveTextContent("AWS SageMaker");
    expect(
      Array.from(
        container.querySelectorAll<HTMLImageElement>("[data-path-brand-mark]"),
      ).map((image) => ({ alt: image.alt, src: image.getAttribute("src") })),
    ).toEqual([
      { alt: "", src: "/path-logos/johns-hopkins-shield.svg" },
      { alt: "", src: "/path-logos/aws-cloud.svg" },
      { alt: "", src: "/path-logos/amazon-sagemaker-ai.svg" },
      { alt: "", src: "/path-logos/weights-and-biases.svg" },
    ]);
    expect(awsMarks.map((image) => image.getAttribute("src"))).toEqual([
      "/path-logos/aws-cloud.svg",
      "/path-logos/amazon-sagemaker-ai.svg",
    ]);
    expect(container.querySelector(".narrative-card__identity-row")).toBeNull();
    expect(screen.getAllByRole("heading", { name: "AWS SageMaker" })).toHaveLength(
      1,
    );
  });

  it("activates a project card explicitly", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderWheel({ activeId: "projects/ucredit", onActivate });

    await user.click(screen.getByRole("button", { name: "Open Monopole" }));
    expect(onActivate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "projects/monopole", kind: "project" }),
    );
  });

  it("renders each coda with its constellation's card language", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderWheel({ onActivate });

    const pathCoda = screen.getByRole("button", {
      name: "Focus Wherever the future holds...",
    });
    const projectCoda = screen.getByRole("button", {
      name: "Focus Builder tinkering...",
    });
    const quoteCoda = screen.getByRole("button", {
      name: "Focus Ever learning and growing, looking more inspiration...",
    });

    expect(pathCoda.closest("article")).toHaveClass("narrative-card--path");
    expect(projectCoda.closest("article")).toHaveClass(
      "narrative-card--project",
    );
    expect(quoteCoda.closest("article")).toHaveClass("narrative-card--quote");

    await user.click(pathCoda);
    expect(onActivate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "path/future", kind: "coda" }),
    );
  });

  it("settles a requested landmark before applying open-sky wheel input", () => {
    const ref = createRef<NarrativeWheelHandle>();
    const scrollIntoView = vi.fn();
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    HTMLElement.prototype.scrollBy = scrollBy;

    renderWheel({}, ref);

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

    renderWheel({}, ref);

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

    renderWheel({}, ref);

    const scroll = screen.getByLabelText("Story sequence");
    makeScrollable(scroll, 0);
    ref.current?.scrollBy({ deltaY: -2, deltaMode: 1 });
    ref.current?.scrollBy({ deltaY: 2, deltaMode: 1 });

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 32 });
  });

  it("reports continuous progress before the nearest beat changes", () => {
    const onProgressChange = vi.fn();
    renderWheel({ onProgressChange });

    const scroll = screen.getByLabelText("Story sequence");
    scroll.getBoundingClientRect = () =>
      ({ top: 0, height: 400 } as DOMRect);
    Array.from(scroll.querySelectorAll<HTMLElement>("[data-story-beat]")).forEach(
      (element, index) => {
        element.getBoundingClientRect = () =>
          ({ top: index * 200, height: 200 } as DOMRect);
      },
    );

    fireEvent.scroll(scroll);

    expect(onProgressChange).toHaveBeenLastCalledWith(
      0.5 / (beats.length - 1),
      null,
    );
  });

  it("reports star-to-star travel before the active card changes", () => {
    const onProgressChange = vi.fn();
    const onActiveBeat = vi.fn();
    renderWheel({
      activeId: "path/johns-hopkins",
      onActiveBeat,
      onProgressChange,
    });

    const scroll = screen.getByLabelText("Story sequence");
    scroll.getBoundingClientRect = () =>
      ({ top: 800, height: 400 } as DOMRect);
    Array.from(scroll.querySelectorAll<HTMLElement>("[data-story-beat]")).forEach(
      (element, index) => {
        element.getBoundingClientRect = () =>
          ({ top: index * 200, height: 200 } as DOMRect);
      },
    );

    fireEvent.scroll(scroll);

    expect(onProgressChange).toHaveBeenLastCalledWith(
      4.5 / (beats.length - 1),
      expect.objectContaining({
        view: "path",
        fromSlug: "johns-hopkins",
        toSlug: "aws-sagemaker",
        progress: 0.5,
      }),
    );
    expect(onActiveBeat).not.toHaveBeenCalled();
  });
});
