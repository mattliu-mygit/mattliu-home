import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("personal universe", () => {
  it("starts at a sparse universe with two labeled constellations", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /software should show its work/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Explore Projects" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Explore Quotes" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Open Projects with Monopole selected",
      }),
    ).toBeVisible();
    const quoteStar = screen.getByRole("button", {
      name: "Open Quotes with Less is more. selected",
    });
    expect(quoteStar).toBeVisible();
    expect(
      quoteStar.querySelector(".constellation-star__label"),
    ).toHaveTextContent("Ludwig Mies van der Rohe");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("carries a universe star selection into its constellation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Open Projects with Monopole selected",
      }),
    );

    expect(window.location.hash).toBe("#projects");
    expect(screen.getByRole("main")).toHaveStyle({
      "--camera-origin-x": "64%",
      "--camera-origin-y": "40%",
    });
    const selected = screen.getByRole("button", {
      name: "Explore Monopole",
    });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(selected);
    expect(window.location.hash).toBe("#projects/monopole");
    expect(screen.getByRole("dialog", { name: "Monopole" })).toBeVisible();
  });

  it("returns focus to the universe star that opened a constellation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const origin = screen.getByRole("button", {
      name: "Open Projects with Monopole selected",
    });
    await user.click(origin);
    await user.click(screen.getByRole("button", { name: "Universe" }));

    expect(
      screen.getByRole("button", {
        name: "Open Projects with Monopole selected",
      }),
    ).toHaveFocus();
  });

  it("enters Projects with a URL and focused constellation heading", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Explore Projects" }),
    );

    const heading = screen.getByRole("heading", {
      name: "Projects constellation",
    });
    expect(window.location.hash).toBe("#projects");
    expect(heading).toHaveFocus();
    expect(
      screen.getAllByRole("button", { name: /^Explore (?!Projects$)/ }),
    ).toHaveLength(5);
  });

  it("returns to the universe and restores constellation focus", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", {
      name: "Explore Projects",
    });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Universe" }));

    expect(window.location.hash).toBe("");
    expect(
      screen.getByRole("button", { name: "Explore Projects" }),
    ).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Explore Monopole" }),
    ).not.toBeInTheDocument();
  });

  it("uses Escape to leave a constellation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Explore Quotes" }));
    await user.keyboard("{Escape}");

    expect(window.location.hash).toBe("");
    expect(
      screen.getByRole("button", { name: "Explore Quotes" }),
    ).toHaveFocus();
  });

  it("enters Quotes and reveals a selected quote", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Explore Quotes" }));

    expect(window.location.hash).toBe("#quotes");
    expect(
      screen.getByRole("region", { name: "Quotes constellation" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /^Read quote:/i }),
    ).toHaveLength(7);

    await user.click(
      screen.getByRole("button", {
        name: /read quote: strong opinions, weakly held/i,
      }),
    );
    expect(
      screen.getByText("Paul Saffo", { selector: ".quote-readout a" }),
    ).toBeVisible();
  });

  it("links the playful Churchill attribution to its research", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Explore Quotes" }));
    await user.click(
      screen.getByRole("button", {
        name: /read quote: success is going from failure to failure/i,
      }),
    );

    const attribution = screen.getByRole("link", {
      name: "Maybe Churchill",
    });
    expect(attribution).toHaveAttribute(
      "href",
      "https://quoteinvestigator.com/2014/06/28/success/",
    );
    expect(attribution).toHaveTextContent("Maybe Churchill ↗");
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

  it("opens and closes a project lens while preserving the hierarchy", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Explore Projects" }),
    );
    const trigger = screen.getByRole("button", {
      name: "Explore Monopole",
    });
    await user.click(trigger);

    expect(window.location.hash).toBe("#projects/monopole");
    expect(screen.getByRole("dialog", { name: "Monopole" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(window.location.hash).toBe("#projects");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps case-study artifacts truthful", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Explore Projects" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Explore LLM-as-a-Judge" }),
    );

    const dialog = screen.getByRole("dialog", { name: "LLM-as-a-Judge" });
    expect(dialog.querySelector('[data-artifact="judge"]')).toBeInTheDocument();
    expect(dialog.querySelector(".project-lens__link")).not.toBeInTheDocument();
  });

  it("opens a project from a valid hierarchical fragment", () => {
    window.history.replaceState(null, "", "/#projects/ucredit");
    render(<App />);

    expect(screen.getByRole("dialog", { name: "UCredit" })).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Projects constellation" }),
    ).toBeVisible();
  });

  it("returns invalid fragments to the universe", () => {
    window.history.replaceState(null, "", "/#not-a-project");
    render(<App />);

    expect(window.location.hash).toBe("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Explore Projects" }),
    ).toBeVisible();
  });

  it("synchronizes camera state from browser history", () => {
    render(<App />);

    act(() => {
      window.history.pushState(null, "", "#quotes");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      screen.getByRole("region", { name: "Quotes constellation" }),
    ).toBeVisible();
  });
});
