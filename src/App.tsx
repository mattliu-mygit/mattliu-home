import { useCallback, useEffect, useRef, useState } from "react";

import { CelestialScene } from "./components/CelestialScene";
import {
  ConstellationMap,
  type ConstellationItem,
} from "./components/ConstellationMap";
import { ProjectLens } from "./components/ProjectLens";
import { QuoteReadout } from "./components/QuoteReadout";
import {
  StoryDrawer,
  type StoryScrollRequest,
} from "./components/StoryDrawer";
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
import {
  createStoryBeats,
  storyBeatForLocation,
  type StoryBeat,
} from "./story-navigation";

const { person, projects, quotes, destinations } = siteContent;
const projectDestination = destinations.find(
  (destination) => destination.slug === "projects",
)!;
const quoteDestination = destinations.find(
  (destination) => destination.slug === "quotes",
)!;
const storyBeats = createStoryBeats(siteContent);
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

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

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
  const [activeStoryId, setActiveStoryId] = useState(() =>
    storyBeatForLocation(
      parseUniverseLocation(window.location.hash),
      siteContent.quotes[0].slug,
    ),
  );
  const [drawerCollapsed, setDrawerCollapsed] = useState(
    () => window.sessionStorage.getItem("story-drawer-collapsed") === "true",
  );
  const [scrollRequest, setScrollRequest] =
    useState<StoryScrollRequest | null>(null);
  const [cameraTransition, setCameraTransition] = useState<
    "arrive" | "pan"
  >("arrive");
  const [cameraPan, setCameraPan] = useState<"forward" | "back">("forward");
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const lastUniverseTarget = useRef<{
    slug: DestinationSlug;
    itemSlug?: string;
  } | null>(null);
  const lastProjectTrigger = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef<PendingFocus>(null);
  const pendingProjectOpen = useRef<string | null>(null);
  const scrollRequestKey = useRef(0);
  const selectedProject =
    location.view === "projects" && location.projectSlug
      ? projectBySlug(location.projectSlug)
      : undefined;
  const selectedQuote =
    quotes.find((quote) => quote.slug === selectedQuoteSlug) ?? quotes[0];

  const requestStoryScroll = useCallback(
    (id: string, behavior?: ScrollBehavior) => {
      scrollRequestKey.current += 1;
      setScrollRequest({
        id,
        key: scrollRequestKey.current,
        behavior:
          behavior ?? (prefersReducedMotion() ? "auto" : "smooth"),
      });
    },
    [],
  );

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
      setCameraTransition("arrive");
      if (view === "projects" && itemSlug) {
        setSelectedProjectSlug(itemSlug);
        pendingProjectOpen.current = itemSlug;
      } else if (view === "quotes" && itemSlug) {
        setSelectedQuoteSlug(itemSlug);
        pendingProjectOpen.current = null;
      } else {
        pendingProjectOpen.current = null;
      }
      const storyId = itemSlug ? `${view}/${itemSlug}` : view;
      setActiveStoryId(storyId);
      requestStoryScroll(storyId);
      commitLocation({ view }, { focus: { type: "heading" } });
    },
    [commitLocation, requestStoryScroll],
  );

  const returnToUniverse = useCallback(() => {
    const destination =
      location.view === "universe" ? "projects" : location.view;
    const previousTarget = lastUniverseTarget.current;
    pendingProjectOpen.current = null;
    setCameraTransition("arrive");
    setActiveStoryId("intro");
    requestStoryScroll("intro");
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
  }, [commitLocation, location.view, requestStoryScroll]);

  const openProject = useCallback(
    (slug: string) => {
      pendingProjectOpen.current = null;
      lastProjectTrigger.current = document.activeElement as HTMLElement | null;
      setSelectedProjectSlug(slug);
      setActiveStoryId(`projects/${slug}`);
      requestStoryScroll(`projects/${slug}`);
      commitLocation({ view: "projects", projectSlug: slug });
    },
    [commitLocation, requestStoryScroll],
  );

  const closeProject = useCallback(() => {
    commitLocation(
      { view: "projects" },
      { replace: true, focus: { type: "project" } },
    );
  }, [commitLocation]);

  const selectQuote = useCallback(
    (slug: string, options: { scroll?: boolean } = {}) => {
      setSelectedQuoteSlug(slug);
      setActiveStoryId(`quotes/${slug}`);
      if (options.scroll !== false) {
        requestStoryScroll(`quotes/${slug}`);
      }
    },
    [requestStoryScroll],
  );

  const handleStoryBeat = useCallback(
    (beat: StoryBeat) => {
      if (beat.id === activeStoryId) {
        return;
      }
      pendingProjectOpen.current = null;
      const previousView = location.view;
      setActiveStoryId(beat.id);

      if (beat.kind === "intro") {
        setCameraTransition("arrive");
        commitLocation({ view: "universe" }, { replace: true });
        return;
      }

      const destination = destinations.find(
        ({ slug }) => slug === beat.view,
      );
      setCameraOrigin(destination?.position ?? [50, 50]);
      setCameraTransition(
        previousView !== "universe" && previousView !== beat.view
          ? "pan"
          : "arrive",
      );
      if (previousView !== "universe" && previousView !== beat.view) {
        setCameraPan(beat.view === "quotes" ? "forward" : "back");
      }

      if (beat.kind === "project") {
        setSelectedProjectSlug(beat.itemSlug);
      } else if (beat.kind === "quote") {
        setSelectedQuoteSlug(beat.itemSlug);
      }
      commitLocation({ view: beat.view }, { replace: true });
    },
    [activeStoryId, commitLocation, location.view],
  );

  const activateStoryBeat = useCallback(
    (beat: StoryBeat) => {
      setActiveStoryId(beat.id);
      requestStoryScroll(beat.id);

      if (beat.kind === "intro") {
        returnToUniverse();
      } else if (beat.kind === "destination") {
        enterConstellation(beat.view);
      } else if (beat.kind === "project") {
        if (location.view === "projects") {
          openProject(beat.itemSlug);
        } else {
          enterConstellation("projects", beat.itemSlug);
          if (prefersReducedMotion()) {
            queueMicrotask(() => openProject(beat.itemSlug));
          }
        }
      } else if (location.view === "quotes") {
        selectQuote(beat.itemSlug);
      } else {
        enterConstellation("quotes", beat.itemSlug);
      }
    },
    [
      enterConstellation,
      location.view,
      openProject,
      requestStoryScroll,
      returnToUniverse,
      selectQuote,
    ],
  );

  const finishCameraArrival = useCallback(
    (event: React.AnimationEvent<HTMLElement>) => {
      if (
        event.target !== event.currentTarget ||
        !pendingProjectOpen.current
      ) {
        return;
      }
      openProject(pendingProjectOpen.current);
    },
    [openProject],
  );

  const changeDrawerVisibility = useCallback((collapsed: boolean) => {
    setDrawerCollapsed(collapsed);
    window.sessionStorage.setItem(
      "story-drawer-collapsed",
      String(collapsed),
    );
  }, []);

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
      pendingProjectOpen.current = null;
      if (nextLocation.view === "projects" && nextLocation.projectSlug) {
        setSelectedProjectSlug(nextLocation.projectSlug);
      }
      const nextStoryId = storyBeatForLocation(
        nextLocation,
        selectedQuoteSlug,
      );
      setActiveStoryId(nextStoryId);
      requestStoryScroll(nextStoryId, "auto");
      setLocation(nextLocation);
    };

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [requestStoryScroll, selectedQuoteSlug]);

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

      <div
        className="universe-stage"
        data-drawer-collapsed={drawerCollapsed ? "true" : undefined}
        data-view={location.view}
      >
        <h1 className="sr-only">{person.headline}</h1>
        <p className="sr-only">{person.introduction}</p>
        <StoryDrawer
          activeId={activeStoryId}
          beats={storyBeats}
          collapsed={drawerCollapsed}
          onActivate={activateStoryBeat}
          onActiveBeat={handleStoryBeat}
          onCollapsedChange={changeDrawerVisibility}
          scrollRequest={scrollRequest}
        />

        {location.view === "universe" ? (
          <UniverseOverview
            destinations={destinations}
            items={constellationItems}
            onSelect={enterConstellation}
          />
        ) : (
          <section
            className={`constellation-view constellation-view--${location.view}`}
            data-camera-pan={cameraPan}
            data-camera-transition={cameraTransition}
            onAnimationEnd={finishCameraArrival}
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
                <QuoteReadout
                  hidden={!drawerCollapsed}
                  quote={selectedQuote}
                />
                <ConstellationMap
                  kind="quotes"
                  items={constellationItems.quotes}
                  connections={quoteDestination.connections}
                  activeSlug={selectedQuote.slug}
                  getAccessibleName={(quote) => `Read quote: ${quote.label}`}
                  onSelect={(slug) => selectQuote(slug)}
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
