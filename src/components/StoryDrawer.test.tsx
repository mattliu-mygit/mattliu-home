import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteContent } from "../content/site-content";
import { createStoryBeats } from "../story-navigation";
import { StoryDrawer } from "./StoryDrawer";

const beats = createStoryBeats(siteContent);

afterEach(cleanup);

describe("StoryDrawer", () => {
  it("renders shared project and quote content without the biography copy", () => {
    render(
      <StoryDrawer
        activeId="intro"
        beats={beats}
        collapsed={false}
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
        scrollRequest={null}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Story sequence")).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(
      screen.getByRole("button", { name: "Open UCredit" }),
    ).toBeVisible();
    expect(
      screen.getByText("Less is more.", { selector: "blockquote" }),
    ).toBeVisible();
    expect(
      screen.queryByText("Software should show its work."),
    ).not.toBeInTheDocument();
  });

  it("activates project cards explicitly", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <StoryDrawer
        activeId="projects/ucredit"
        beats={beats}
        collapsed={false}
        onActivate={onActivate}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
        scrollRequest={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open Monopole" }));

    expect(onActivate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "projects/monopole",
        kind: "project",
      }),
    );
  });

  it("collapses and restores without replacing the active story item", async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    const { rerender } = render(
      <StoryDrawer
        activeId="projects/ucredit"
        beats={beats}
        collapsed={false}
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={onCollapsedChange}
        scrollRequest={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hide story" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);

    rerender(
      <StoryDrawer
        activeId="projects/ucredit"
        beats={beats}
        collapsed
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={onCollapsedChange}
        scrollRequest={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Show story" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toHaveAttribute("data-active-beat", "projects/ucredit");
  });

  it("scrolls a requested story beat into the center", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <StoryDrawer
        activeId="projects/monopole"
        beats={beats}
        collapsed={false}
        onActivate={() => undefined}
        onActiveBeat={() => undefined}
        onCollapsedChange={() => undefined}
        scrollRequest={{
          behavior: "auto",
          id: "projects/monopole",
          key: 1,
        }}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
  });
});
