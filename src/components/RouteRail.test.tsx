import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteContent } from "../content/site-content";
import { createStoryBeats } from "../story-navigation";
import { RouteRail } from "./RouteRail";

const beats = createStoryBeats(siteContent);

afterEach(cleanup);

describe("RouteRail", () => {
  it("renders one instrument tick per beat with major route labels", () => {
    render(<RouteRail activeId="path" beats={beats} onSelect={() => undefined} />);

    expect(screen.getAllByRole("button")).toHaveLength(beats.length);
    expect(screen.getByRole("button", { name: "Go to Universe" })).toBeVisible();
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
    render(<RouteRail activeId="intro/name" beats={beats} onSelect={onSelect} />);

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
      />,
    );

    expect(screen.getByRole("navigation", { name: "Story scrollbar" })).toHaveStyle({
      "--route-progress": "25%",
    });
  });
});
