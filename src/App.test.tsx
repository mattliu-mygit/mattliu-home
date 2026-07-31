import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("personal universe", () => {
  it("renders the quiet-zone introduction and five project constellations", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /software should show its work/i,
      }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /^explore /i }),
    ).toHaveLength(5);
  });

  it("renders projects in chronological DOM order", () => {
    render(<App />);

    expect(
      screen.getAllByTestId("project-year").map((node) => node.textContent),
    ).toEqual(["2020", "2021", "2022", "2026", "Now"]);
  });

  it("opens and closes a project lens while restoring focus", async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = screen.getByRole("button", {
      name: "Explore Monopole",
    });

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Monopole" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens a project from a valid URL fragment and ignores an invalid one", () => {
    window.history.replaceState(null, "", "/#otter");
    const first = render(<App />);
    expect(screen.getByRole("dialog", { name: "Otter" })).toBeVisible();

    first.unmount();
    window.history.replaceState(null, "", "/#not-a-project");
    render(<App />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
