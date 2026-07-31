import { useCallback, useEffect, useRef, useState } from "react";

import { AmbientStars } from "./components/AmbientStars";
import { ConstellationMap } from "./components/ConstellationMap";
import { ProjectLens } from "./components/ProjectLens";
import { QuoteReadout } from "./components/QuoteReadout";
import { ShootingStars } from "./components/ShootingStars";
import { UniverseOverview } from "./components/UniverseOverview";
import {
  projectBySlug,
  siteContent,
  type DestinationSlug,
} from "./content/site-content";
import {
  parseUniverseLocation,
  serializeUniverseLocation,
  type UniverseLocation,
} from "./navigation";

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

const { person, projects, quotes, destinations } = siteContent;

type PendingFocus =
  | { type: "heading" }
  | { type: "destination"; slug: DestinationSlug }
  | { type: "project" }
  | null;

const locationUrl = (location: UniverseLocation) =>
  `${window.location.pathname}${window.location.search}${serializeUniverseLocation(location)}`;

export default function App() {
  const [location, setLocation] = useState(() =>
    parseUniverseLocation(window.location.hash),
  );
  const [selectedQuoteSlug, setSelectedQuoteSlug] = useState(
    siteContent.quotes[0].slug,
  );
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const lastProjectTrigger = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef<PendingFocus>(null);
  const selectedProject =
    location.view === "projects" && location.projectSlug
      ? projectBySlug(location.projectSlug)
      : undefined;
  const selectedQuote =
    quotes.find((quote) => quote.slug === selectedQuoteSlug) ?? quotes[0];

  const commitLocation = useCallback(
    (
      nextLocation: UniverseLocation,
      options: { replace?: boolean; focus?: PendingFocus } = {},
    ) => {
      pendingFocus.current = options.focus ?? null;
      window.history[options.replace ? "replaceState" : "pushState"](
        null,
        "",
        locationUrl(nextLocation),
      );
      setLocation(nextLocation);
    },
    [],
  );

  const enterConstellation = useCallback(
    (view: DestinationSlug) => {
      commitLocation({ view }, { focus: { type: "heading" } });
    },
    [commitLocation],
  );

  const returnToUniverse = useCallback(() => {
    const destination =
      location.view === "universe" ? "projects" : location.view;
    commitLocation(
      { view: "universe" },
      {
        replace: true,
        focus: { type: "destination", slug: destination },
      },
    );
  }, [commitLocation, location.view]);

  const openProject = useCallback(
    (slug: string) => {
      lastProjectTrigger.current = document.activeElement as HTMLElement | null;
      commitLocation({ view: "projects", projectSlug: slug });
    },
    [commitLocation],
  );

  const closeProject = useCallback(() => {
    commitLocation(
      { view: "projects" },
      { replace: true, focus: { type: "project" } },
    );
  }, [commitLocation]);

  useEffect(() => {
    const syncFromUrl = () => {
      const nextLocation = parseUniverseLocation(window.location.hash);
      if (nextLocation.view === "universe" && window.location.hash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
      pendingFocus.current = null;
      setLocation(nextLocation);
    };

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) {
      return;
    }
    pendingFocus.current = null;
    queueMicrotask(() => {
      if (target.type === "heading") {
        viewHeading.current?.focus();
      } else if (target.type === "destination") {
        document
          .getElementById(`universe-destination-${target.slug}`)
          ?.focus();
      } else {
        lastProjectTrigger.current?.focus();
      }
    });
  }, [location]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (location.view === "projects" && location.projectSlug) {
        closeProject();
      } else if (location.view !== "universe") {
        returnToUniverse();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeProject, location, returnToUniverse]);

  return (
    <main className="universe">
      <AmbientStars />
      <ShootingStars />

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="site-nav__name" href="/" aria-label="Matthew Liu home">
          {person.name}
        </a>
        <div className="site-nav__links">
          {person.links.map((link) => (
            <a href={link.url} key={link.label}>
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="universe-stage" data-view={location.view}>
        <header
          className="quiet-zone"
          aria-hidden={location.view === "universe" ? undefined : "true"}
        >
          <p className="eyebrow">{person.eyebrow}</p>
          <h1>
            {person.headlineLead}
            <br />
            <em>{person.headlineEmphasis}</em>
          </h1>
          <p className="introduction">{person.introduction}</p>
        </header>

        {location.view === "universe" ? (
          <UniverseOverview
            destinations={destinations}
            onSelect={enterConstellation}
          />
        ) : (
          <section
            className={`constellation-view constellation-view--${location.view}`}
            role="region"
            aria-labelledby="constellation-view-title"
          >
            <button
              className="universe-return"
              type="button"
              onClick={returnToUniverse}
            >
              <span aria-hidden="true">←</span> Universe
            </button>
            <h2
              className="constellation-view__title"
              id="constellation-view-title"
              ref={viewHeading}
              tabIndex={-1}
            >
              {location.view === "projects"
                ? "Projects constellation"
                : "Quotes constellation"}
            </h2>

            {location.view === "projects" ? (
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
            ) : (
              <>
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
              </>
            )}
          </section>
        )}
      </div>

      {selectedProject ? (
        <ProjectLens project={selectedProject} onClose={closeProject} />
      ) : null}
    </main>
  );
}
