import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { AmbientStars } from "./components/AmbientStars";
import { ConstellationMap } from "./components/ConstellationMap";
import { ProjectLens } from "./components/ProjectLens";
import { QuoteReadout } from "./components/QuoteReadout";
import { useScrollProgress } from "./hooks/useScrollProgress";
import { projectBySlug, projects } from "./projects";
import { quotes } from "./quotes";

type UniverseTab = "projects" | "quotes";

const projectConnections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
] as const;

const quoteConnections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [1, 3],
  [3, 5],
] as const;

const tabs = ["projects", "quotes"] as const;

export default function App() {
  const scrollProgress = useScrollProgress();
  const initialProject = projectBySlug(window.location.hash.slice(1));
  const [activeTab, setActiveTab] = useState<UniverseTab>("projects");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialProject?.slug ?? null,
  );
  const [selectedQuoteSlug, setSelectedQuoteSlug] = useState(quotes[0].slug);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const selectedProject = selectedSlug
    ? projectBySlug(selectedSlug)
    : undefined;
  const selectedQuote =
    quotes.find((quote) => quote.slug === selectedQuoteSlug) ?? quotes[0];

  useEffect(() => {
    const syncSelection = () => {
      const slug = window.location.hash.slice(1);
      const project = projectBySlug(slug);
      setSelectedSlug(project?.slug ?? null);
      if (project) {
        setActiveTab("projects");
      }
    };
    window.addEventListener("hashchange", syncSelection);
    window.addEventListener("popstate", syncSelection);
    return () => {
      window.removeEventListener("hashchange", syncSelection);
      window.removeEventListener("popstate", syncSelection);
    };
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeProject();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  });

  const openProject = (slug: string) => {
    lastTrigger.current = document.activeElement as HTMLElement | null;
    setSelectedSlug(slug);
    window.history.pushState(null, "", `#${slug}`);
  };

  const closeProject = () => {
    setSelectedSlug(null);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    queueMicrotask(() => lastTrigger.current?.focus());
  };

  const selectTab = (tab: UniverseTab, moveFocus = false) => {
    setActiveTab(tab);
    if (moveFocus) {
      queueMicrotask(() => document.getElementById(`tab-${tab}`)?.focus());
    }
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: UniverseTab,
  ) => {
    const currentIndex = tabs.indexOf(currentTab);
    let nextTab: UniverseTab | undefined;

    if (event.key === "ArrowRight") {
      nextTab = tabs[(currentIndex + 1) % tabs.length];
    } else if (event.key === "ArrowLeft") {
      nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
    } else if (event.key === "Home") {
      nextTab = tabs[0];
    } else if (event.key === "End") {
      nextTab = tabs[tabs.length - 1];
    }

    if (nextTab) {
      event.preventDefault();
      selectTab(nextTab, true);
    }
  };

  return (
    <main className="universe">
      <AmbientStars />

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="site-nav__name" href="/" aria-label="Matthew Liu home">
          Matthew Liu
        </a>
        <div className="site-nav__links">
          <a href="https://github.com/mattliu-mygit">GitHub</a>
          <a href="https://www.linkedin.com/in/mattliuhew/">LinkedIn</a>
        </div>
      </nav>

      <div
        className="universe-stage"
        data-scroll-progress={scrollProgress.toFixed(3)}
        style={
          {
            "--constellation-rotation": `${-7 + scrollProgress * 14}deg`,
            "--constellation-scale": 1 + scrollProgress * 0.08,
          } as CSSProperties
        }
      >
        <header className="quiet-zone">
          <p className="eyebrow">Software engineer · Seattle</p>
          <h1>
            Software should
            <br />
            <em>show its work.</em>
          </h1>
          <p className="introduction">
            I build tools that help people inspect, evaluate, and improve
            intelligent systems.
          </p>

          <div className="universe-tabs" role="tablist" aria-label="Explore">
            {tabs.map((tab) => {
              const label = tab === "projects" ? "Projects" : "Quotes";
              const selected = activeTab === tab;
              return (
                <button
                  id={`tab-${tab}`}
                  key={tab}
                  type="button"
                  role="tab"
                  aria-controls={`panel-${tab}`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(tab)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab)}
                >
                  <span aria-hidden="true">0{tabs.indexOf(tab) + 1}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        {activeTab === "projects" ? (
          <section
            className="universe-panel"
            id="panel-projects"
            role="tabpanel"
            aria-labelledby="tab-projects"
          >
            <ConstellationMap
              kind="projects"
              items={projects.map((project) => ({
                slug: project.slug,
                label: project.title,
                meta: project.displayYear,
                position: project.position,
              }))}
              connections={projectConnections}
              getAccessibleName={(project) => `Explore ${project.label}`}
              onSelect={openProject}
            />
          </section>
        ) : (
          <section
            className="universe-panel"
            id="panel-quotes"
            role="tabpanel"
            aria-labelledby="tab-quotes"
          >
            <QuoteReadout quote={selectedQuote} />
            <ConstellationMap
              kind="quotes"
              items={quotes.map((quote) => ({
                slug: quote.slug,
                label: quote.text,
                meta: quote.author,
                position: quote.position,
              }))}
              connections={quoteConnections}
              activeSlug={selectedQuote.slug}
              getAccessibleName={(quote) => `Read quote: ${quote.label}`}
              onSelect={setSelectedQuoteSlug}
            />
          </section>
        )}
      </div>

      {selectedProject ? (
        <ProjectLens project={selectedProject} onClose={closeProject} />
      ) : null}
    </main>
  );
}
