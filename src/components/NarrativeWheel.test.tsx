import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
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
    ref.current?.scrollBy(160);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "auto",
      block: "center",
    });
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 160 });
  });
});
