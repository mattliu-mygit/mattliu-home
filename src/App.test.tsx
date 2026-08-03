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
import { siteContent } from "./content/site-content";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "startViewTransition");
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
    ).toHaveTextContent("Less is more.");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("uses experience periods beneath Path constellation names", () => {
    render(<App />);

    const expectedPeriods = {
      "johns-hopkins": "2019–2023",
      "aws-sagemaker": "2023–2026",
      "wandb-weave": "2026–Present",
    };

    for (const [slug, period] of Object.entries(expectedPeriods)) {
      const star = document.querySelector(
        `#constellation-star-path-${slug}`,
      );

      expect(star?.querySelector(".constellation-star__meta")).toHaveTextContent(
        period,
      );
    }
  });

  it("moves Matthew Liu into the header only after the intro", async () => {
    const user = userEvent.setup();
    render(<App />);
    const identity = document.querySelector(".site-nav__identity");

    expect(identity).toHaveAttribute("aria-hidden", "true");
    await user.click(screen.getByRole("button", { name: "Go to Principle" }));
    expect(identity).toHaveAttribute("aria-hidden", "true");
    await user.click(screen.getByRole("button", { name: "Go to Context" }));
    expect(identity).toHaveAttribute("aria-hidden", "true");
    await user.click(screen.getByRole("button", { name: "Go to Path" }));
    expect(identity).not.toHaveAttribute("aria-hidden");
    await user.click(screen.getByRole("button", { name: "Go to Intro" }));
    expect(identity).toHaveAttribute("aria-hidden", "true");
  });

  it("enters an observational immersive view without changing the story", async () => {
    const user = userEvent.setup();
    render(<App />);
    const story = screen.getByRole("region", { name: "Portfolio story" });
    const initialHash = window.location.hash;
    const galaxyIcon = screen.getByTestId("immersive-galaxy-icon");
    expect(
      screen.queryByRole("button", { name: /^(Show|Hide) story$/ }),
    ).not.toBeInTheDocument();
    expect(galaxyIcon).toBeInTheDocument();
    expect(
      galaxyIcon.querySelectorAll("[data-galaxy-arm] circle"),
    ).toHaveLength(64);
    expect(screen.queryByTestId("immersive-exit-icon")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Enter immersive view" }),
    );

    expect(screen.getByRole("main")).toHaveAttribute(
      "data-immersive",
      "true",
    );
    expect(window.location.hash).toBe(initialHash);
    expect(story).toHaveAttribute("data-active-beat", "intro/name");
    expect(screen.getByTestId("constellation-world")).toHaveAttribute("inert");
    expect(screen.getByTestId("constellation-world")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      screen.queryByRole("button", {
        name: "Open Path with Johns Hopkins University selected",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Exit immersive view" }),
    ).toBeVisible();
    expect(
      screen.queryByTestId("immersive-galaxy-icon"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("immersive-exit-icon")).toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: "Exit immersive view" })
        .querySelector("svg"),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.getByRole("main")).not.toHaveAttribute("data-immersive");
    expect(
      screen.getByRole("button", { name: "Enter immersive view" }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Explore Path" }));
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-camera-focused",
      "true",
    );

    await user.click(
      screen.getByRole("button", { name: "Enter immersive view" }),
    );

    expect(window.location.hash).toBe("#path");
    expect(screen.getByRole("main")).not.toHaveAttribute(
      "data-camera-focused",
    );
    expect(screen.getByTestId("constellation-world")).toHaveAttribute("inert");
  });

  it("cancels a pending project lens when immersive mode takes over", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Open Projects with Monopole selected",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Enter immersive view" }),
    );
    fireEvent.transitionEnd(screen.getByTestId("constellation-world"), {
      propertyName: "transform",
    });

    expect(window.location.hash).toBe("#projects");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-immersive",
      "true",
    );
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

  it("opens a constellation coda as its selected story card", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Open Projects with Builder tinkering... selected",
      }),
    );

    expect(window.location.hash).toBe("#projects/builder");
    expect(
      screen.getByRole("region", { name: "Portfolio story" }),
    ).toHaveAttribute("data-active-beat", "projects/builder");
    expect(
      screen.getByRole("button", { name: "Explore Builder tinkering..." }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the same constellation star mounted across zoom levels", async () => {
    const user = userEvent.setup();
    render(<App />);

    const star = screen.getByRole("button", {
      name: "Open Path with Johns Hopkins University selected",
    });
    await user.click(star);

    expect(
      within(screen.getByRole("region", { name: "Path constellation" })).getByRole(
        "button",
        {
        name: "Focus Johns Hopkins University",
        },
      ),
    ).toBe(star);

    await user.click(screen.getByRole("button", { name: "Go to Intro" }));
    expect(
      screen.getByRole("button", {
        name: "Open Path with Johns Hopkins University selected",
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
    await user.click(screen.getByRole("button", { name: "Go to Intro" }));

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
    ).toHaveLength(6);
  });

  it("returns to the universe and restores constellation focus", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", {
      name: "Explore Projects",
    });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Go to Intro" }));

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
    ).toHaveLength(siteContent.quotes.length);

    await user.click(
      screen.getByRole("button", {
        name: /read quote: strong opinions, weakly held/i,
      }),
    );
    expect(
      screen.getByRole("button", {
        name: /read quote: strong opinions, weakly held/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
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

  it("links to verified public profiles and direct email", () => {
    render(<App />);

    const github = screen.getByRole("link", { name: "GitHub" });
    const linkedIn = screen.getByRole("link", { name: "LinkedIn" });
    const email = screen.getByRole("link", { name: "Email Matthew" });
    expect(github).toHaveAttribute(
      "href",
      "https://github.com/mattliu-mygit",
    );
    expect(linkedIn).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/mattliuhew/",
    );
    expect(email).toHaveAttribute("href", "mailto:mattliujhu@gmail.com");
    expect(email).toHaveAttribute("title", "Email Matthew");
    expect(github.querySelector("svg")).toBeInTheDocument();
    expect(linkedIn.querySelector("svg")).toBeInTheDocument();
    expect(email.querySelector("svg")).toBeInTheDocument();
    expect(github).toHaveClass("site-nav__icon-link");
    expect(linkedIn).toHaveClass("site-nav__icon-link");
    expect(email).toHaveClass("site-nav__icon-link");
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
