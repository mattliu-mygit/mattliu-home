import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "startViewTransition");
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("personal universe", () => {
  it("starts with the intro, route, and three labeled constellations", () => {
    render(<App />);

    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toHaveAttribute("data-active-beat", "intro/name");
    expect(screen.getByRole("heading", { name: "Matthew Liu" })).toBeVisible();
    expect(screen.getByText(/keep intelligent software/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Explore Path" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Explore Projects" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Explore Quotes" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Story scrollbar" }),
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

  it("uses a project card to enter its existing constellation selection", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Monopole" }));

    expect(window.location.hash).toBe("#projects");
    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toHaveAttribute("data-active-beat", "projects/monopole");
    expect(
      screen.getByRole("button", { name: "Explore Monopole" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("collapses the story without changing its active item", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Monopole" }));
    await user.click(screen.getByRole("button", { name: "Hide story" }));

    expect(screen.getByRole("button", { name: "Show story" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toHaveAttribute("data-active-beat", "projects/monopole");
    expect(window.location.hash).toBe("#projects");
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
      "--camera-origin-x": "77%",
      "--camera-origin-y": "48%",
    });
    const selected = screen.getByRole("button", {
      name: "Explore Monopole",
    });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.transitionEnd(screen.getByTestId("constellation-world"), {
      propertyName: "transform",
    });
    expect(window.location.hash).toBe("#projects/monopole");
    expect(screen.getByRole("dialog", { name: "Monopole" })).toBeVisible();
  });

  it("keeps the same constellation star mounted across zoom levels", async () => {
    const user = userEvent.setup();
    render(<App />);

    const star = screen.getByRole("button", {
      name: "Open Path with Johns Hopkins Whiting School of Engineering selected",
    });
    await user.click(star);

    expect(
      within(screen.getByRole("region", { name: "Path constellation" })).getByRole(
        "button",
        {
        name: "Focus Johns Hopkins Whiting School of Engineering",
        },
      ),
    ).toBe(star);

    await user.click(screen.getByRole("button", { name: "Go to Origin" }));
    expect(
      screen.getByRole("button", {
        name: "Open Path with Johns Hopkins Whiting School of Engineering selected",
      }),
    ).toBe(star);
  });

  it("lets the camera own constellation entry motion", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Explore Projects" }));

    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "auto",
      block: "center",
    });
  });

  it("centers a same-constellation card without adding camera motion", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Explore Path" }));
    const callsBeforeCardClick = scrollIntoView.mock.calls.length;
    await user.click(
      within(screen.getByRole("region", { name: "Portfolio story" })).getByRole(
        "button",
        { name: "Focus AWS SageMaker" },
      ),
    );

    expect(scrollIntoView).toHaveBeenCalledTimes(callsBeforeCardClick + 1);
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(window.location.hash).toBe("#path/aws-sagemaker");
  });

  it("opens a selected universe project after the persistent camera settles", async () => {
    const user = userEvent.setup();
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Open Projects with Monopole selected",
      }),
    );

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#projects");
    expect(
      screen.getByRole("region", { name: "Projects constellation" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.transitionEnd(screen.getByTestId("constellation-world"), {
      propertyName: "transform",
    });

    expect(window.location.hash).toBe("#projects/monopole");
    expect(screen.getByRole("dialog", { name: "Monopole" })).toBeVisible();
  });

  it("never snapshots constellation travel in either direction", async () => {
    const user = userEvent.setup();
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Explore Path" }));
    await user.click(screen.getByRole("button", { name: "Go to Projects" }));
    await user.click(screen.getByRole("button", { name: "Go to Origin" }));

    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it("uses a Path star to zoom to the matching professional card", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Open Path with AWS SageMaker selected",
      }),
    );

    expect(window.location.hash).toBe("#path/aws-sagemaker");
    const pathRegion = screen.getByRole("region", {
      name: "Path constellation",
    });
    expect(
      within(pathRegion).getByRole("button", { name: "Focus AWS SageMaker" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toHaveAttribute("data-active-beat", "path/aws-sagemaker");
  });

  it("uses the route as passive focus without opening project content", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Go to Monopole" }));

    expect(window.location.hash).toBe("#projects");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toHaveAttribute("data-active-beat", "projects/monopole");
  });

  it("keeps one constellation stage while consecutive destinations pan", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Go to Path" }));
    const pathRegion = screen.getByRole("region", { name: "Path constellation" });
    await user.click(screen.getByRole("button", { name: "Go to Projects" }));
    const projectRegion = screen.getByRole("region", {
      name: "Projects constellation",
    });
    await user.click(screen.getByRole("button", { name: "Go to Quotes" }));
    const quoteRegion = screen.getByRole("region", {
      name: "Quotes constellation",
    });

    expect(projectRegion).toBe(pathRegion);
    expect(quoteRegion).toBe(projectRegion);
    expect(screen.getByRole("main")).toHaveStyle({
      "--camera-origin-x": "63%",
      "--camera-origin-y": "72%",
      "--camera-scale": "3.4",
    });

    await user.click(
      screen.getByRole("button", {
        name: /go to quote by paul saffo/i,
      }),
    );
    expect(screen.getByTestId("constellation-world")).toBeInTheDocument();
  });

  it("opens a universe project star without waiting for animation in reduced motion", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const startViewTransition = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Open Projects with Monopole selected",
      }),
    );

    expect(screen.getByRole("dialog", { name: "Monopole" })).toBeVisible();
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it("returns focus to the universe star that opened a constellation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const origin = screen.getByRole("button", {
      name: "Open Projects with Monopole selected",
    });
    await user.click(origin);
    await user.click(screen.getByRole("button", { name: "Go to Origin" }));

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
    await user.click(screen.getByRole("button", { name: "Go to Origin" }));

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
