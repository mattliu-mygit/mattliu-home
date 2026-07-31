import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("personal universe", () => {
  it("renders Projects as the initial five-star constellation", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /software should show its work/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "Projects" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Quotes" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(
      screen.getAllByRole("button", { name: /^explore /i }),
    ).toHaveLength(5);
  });

  it("switches to Quotes and reveals a selected quote", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "Quotes" }));

    expect(
      screen.getByRole("tabpanel", { name: "Quotes" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /^read quote:/i }),
    ).toHaveLength(7);

    await user.click(
      screen.getByRole("button", {
        name: /read quote: strong opinions, weakly held/i,
      }),
    );
    expect(
      screen.getByText("Paul Saffo", { selector: ".quote-readout a" }),
    ).toBeVisible();
    expect(
      screen.getByText("Strong opinions, weakly held.", {
        selector: ".quote-readout blockquote",
      }),
    ).toBeVisible();
  });

  it("moves between tabs with arrow keys", async () => {
    const user = userEvent.setup();
    render(<App />);

    const projectsTab = screen.getByRole("tab", { name: "Projects" });
    projectsTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Quotes" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("links only to verified public profiles", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/mattliu-mygit",
    );
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/mattliuhew/",
    );
    expect(screen.queryByRole("link", { name: "Email" })).not.toBeInTheDocument();
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

  it("uses a case-study artifact without inventing a source link", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Explore LLM-as-a-Judge" }),
    );

    const dialog = screen.getByRole("dialog", { name: "LLM-as-a-Judge" });
    expect(dialog).toBeVisible();
    expect(
      dialog.querySelector('[data-artifact="judge"]'),
    ).toBeInTheDocument();
    expect(dialog.querySelector(".project-lens__link")).not.toBeInTheDocument();
  });

  it("links the model customization case study to the verified launch", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Explore Model Customization Assistant",
      }),
    );

    expect(
      screen.getByRole("link", { name: /read the launch/i }),
    ).toHaveAttribute(
      "href",
      "https://aws.amazon.com/blogs/machine-learning/agent-guided-workflows-to-accelerate-model-customization-in-amazon-sagemaker-ai/",
    );
    expect(
      document.querySelector('[data-artifact="customization"]'),
    ).toBeInTheDocument();
  });

  it("opens a project from a valid URL fragment and ignores an invalid one", () => {
    window.history.replaceState(null, "", "/#ucredit");
    const first = render(<App />);
    expect(screen.getByRole("dialog", { name: "UCredit" })).toBeVisible();

    first.unmount();
    window.history.replaceState(null, "", "/#not-a-project");
    render(<App />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
