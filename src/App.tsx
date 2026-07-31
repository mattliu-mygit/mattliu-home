import { useCallback, useEffect, useRef, useState } from "react";

import { CelestialScene } from "./components/CelestialScene";
import {
  ConstellationMap,
  type ConstellationItem,
} from "./components/ConstellationMap";
import { ProjectLens } from "./components/ProjectLens";
import { QuoteReadout } from "./components/QuoteReadout";
import { UniverseOverview } from "./components/UniverseOverview";
import {
  projectBySlug,
  siteContent,
  type DestinationSlug,
  type Point,
} from "./content/site-content";
import {
  parseUniverseLocation,
  serializeUniverseLocation,
  type UniverseLocation,
} from "./navigation";

const { person, projects, quotes, destinations } = siteContent;
const projectDestination = destinations.find(
  (destination) => destination.slug === "projects",
)!;
const quoteDestination = destinations.find(
  (destination) => destination.slug === "quotes",
)!;
const constellationItems: Record<
  DestinationSlug,
  readonly ConstellationItem[]
> = {
  projects: projects.map((project) => ({
    slug: project.slug,
    label: project.title,
    meta: project.displayYear,
    position: project.position,
  })),
  quotes: quotes.map((quote) => ({
    slug: quote.slug,
    label: quote.text,
    overviewLabel: quote.author,
    meta: quote.author,
    position: quote.position,
  })),
};

type PendingFocus =
  | { type: "heading" }
  | { type: "universe"; slug: DestinationSlug; itemSlug?: string }
  | { type: "project" }
  | null;

const locationUrl = (location: UniverseLocation) =>
  `${window.location.pathname}${window.location.search}${serializeUniverseLocation(location)}`;

export default function App() {
  const [location, setLocation] = useState(() =>
    parseUniverseLocation(window.location.hash),
  );
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<
    string | undefined
  >(() => {
    const initialLocation = parseUniverseLocation(window.location.hash);
    return initialLocation.view === "projects"
      ? initialLocation.projectSlug
      : undefined;
  });
  const [selectedQuoteSlug, setSelectedQuoteSlug] = useState(
    siteContent.quotes[0].slug,
  );
  const [cameraOrigin, setCameraOrigin] = useState<Point>([50, 50]);
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const lastUniverseTarget = useRef<{
    slug: DestinationSlug;
    itemSlug?: string;
  } | null>(null);
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
    (view: DestinationSlug, itemSlug?: string, origin?: Point) => {
      lastUniverseTarget.current = { slug: view, itemSlug };
      const destination = destinations.find(
        (candidate) => candidate.slug === view,
      );
      setCameraOrigin(origin ?? destination?.position ?? [50, 50]);
      if (view === "projects" && itemSlug) {
        setSelectedProjectSlug(itemSlug);
      } else if (view === "quotes" && itemSlug) {
        setSelectedQuoteSlug(itemSlug);
      }
      commitLocation({ view }, { focus: { type: "heading" } });
    },
    [commitLocation],
  );

  const returnToUniverse = useCallback(() => {
    const destination =
      location.view === "universe" ? "projects" : location.view;
    const previousTarget = lastUniverseTarget.current;
    commitLocation(
      { view: "universe" },
      {
        replace: true,
        focus: {
          type: "universe",
          slug: destination,
          itemSlug:
            previousTarget?.slug === destination
              ? previousTarget.itemSlug
              : undefined,
        },
      },
    );
  }, [commitLocation, location.view]);

  const openProject = useCallback(
    (slug: string) => {
      lastProjectTrigger.current = document.activeElement as HTMLElement | null;
      setSelectedProjectSlug(slug);
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
      if (nextLocation.view === "projects" && nextLocation.projectSlug) {
        setSelectedProjectSlug(nextLocation.projectSlug);
      }
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
      } else if (target.type === "universe") {
        const targetId = target.itemSlug
          ? `constellation-star-overview-${target.slug}-${target.itemSlug}`
          : `universe-destination-${target.slug}`;
        document.getElementById(targetId)?.focus();
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
    <CelestialScene
      cameraOrigin={cameraOrigin}
      interactive={!selectedProject}
      view={location.view}
    >
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
            items={constellationItems}
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
                items={constellationItems.projects}
                connections={projectDestination.connections}
                activeSlug={selectedProjectSlug}
                getAccessibleName={(project) => `Explore ${project.label}`}
                onSelect={openProject}
              />
            ) : (
              <>
                <QuoteReadout quote={selectedQuote} />
                <ConstellationMap
                  kind="quotes"
                  items={constellationItems.quotes}
                  connections={quoteDestination.connections}
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
    </CelestialScene>
  );
}
