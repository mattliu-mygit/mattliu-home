import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  constellationFocusOffset,
  constellationFocusPoint,
  type Point2d,
  worldCameraFor,
} from "./celestial-motion";
import { CelestialScene } from "./components/CelestialScene";
import { type ConstellationItem } from "./components/ConstellationMap";
import {
  ConstellationWorld,
  type ConstellationWorldHandle,
} from "./components/ConstellationWorld";
import { ExternalLink } from "./components/ExternalLink";
import {
  NarrativeWheel,
  type NarrativeWheelHandle,
} from "./components/NarrativeWheel";
import { ProjectLens } from "./components/ProjectLens";
import { QuoteReadout } from "./components/QuoteReadout";
import { RouteRail, type RouteRailHandle } from "./components/RouteRail";
import {
  projectBySlug,
  siteContent,
  type DestinationSlug,
} from "./content/site-content";
import {
  parseUniverseLocation,
  serializeUniverseLocation,
  type UniverseLocation,
  type UniverseView,
} from "./navigation";
import {
  createPortfolioState,
  portfolioReducer,
} from "./portfolio-state";
import {
  createStoryBeats,
  storyBeatForLocation,
  type ConstellationTravel,
  type StoryBeat,
} from "./story-navigation";

const { person, path, projects, quotes, destinations } = siteContent;
const destinationBySlug = Object.fromEntries(
  destinations.map((destination) => [destination.slug, destination]),
) as Record<DestinationSlug, (typeof destinations)[number]>;
const storyBeats = createStoryBeats(siteContent);
const constellationItems: Record<
  DestinationSlug,
  readonly ConstellationItem[]
> = {
  path: path.map((entry) => ({
    slug: entry.slug,
    label: entry.organization,
    overviewLabel: entry.shortLabel,
    meta: entry.area,
    position: entry.position,
    depth: entry.depth,
    tone: entry.tone,
    prominence: entry.prominence,
  })),
  projects: projects.map((project) => ({
    slug: project.slug,
    label: project.title,
    meta: project.displayYear,
    position: project.position,
    depth: project.depth,
    tone: project.tone,
    prominence: project.prominence,
  })),
  quotes: quotes.map((quote) => ({
    slug: quote.slug,
    label: quote.text,
    overviewLabel: quote.author,
    meta: quote.author,
    position: quote.position,
    depth: quote.depth,
    tone: quote.tone,
    prominence: quote.prominence,
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

const locationFor = (
  view: DestinationSlug,
  itemSlug?: string,
): UniverseLocation => {
  if (view === "path") {
    return { view, pathSlug: itemSlug };
  }
  if (view === "projects") {
    return { view };
  }
  return { view, quoteSlug: itemSlug };
};

const directionForSelection = (
  view: DestinationSlug,
  fromSlug?: string,
  toSlug?: string,
): Point2d => {
  const items = constellationItems[view];
  const targetIndex = Math.max(
    0,
    toSlug ? items.findIndex(({ slug }) => slug === toSlug) : 0,
  );
  const fromIndex = fromSlug
    ? items.findIndex(({ slug }) => slug === fromSlug)
    : -1;
  const start = fromIndex >= 0 ? items[fromIndex] : items[targetIndex];
  const target =
    fromIndex >= 0 && fromIndex !== targetIndex
      ? items[targetIndex]
      : items[
          targetIndex < items.length - 1
            ? targetIndex + 1
            : Math.max(0, targetIndex - 1)
        ] ?? start;

  return {
    x: target.position[0] - start.position[0],
    y: target.position[1] - start.position[1],
  };
};

export default function App() {
  const initialLocation = useRef(parseUniverseLocation(window.location.hash));
  const [portfolioState, dispatchPortfolio] = useReducer(
    portfolioReducer,
    initialLocation.current,
    createPortfolioState,
  );
  const { location, activeStoryId, selections } = portfolioState;
  const {
    path: selectedPathSlug,
    projects: selectedProjectSlug,
    quotes: selectedQuoteSlug,
  } = selections;
  const initialStoryProgress = useRef(
    (() => {
      const initialId = storyBeatForLocation(initialLocation.current);
      const index = storyBeats.findIndex((beat) => beat.id === initialId);
      return index < 0 || storyBeats.length <= 1
        ? 0
        : index / (storyBeats.length - 1);
    })(),
  );
  const [wheelCollapsed, setWheelCollapsed] = useState(
    () => window.sessionStorage.getItem("narrative-wheel-collapsed") === "true",
  );
  const [constellationDirection, setConstellationDirection] =
    useState<Point2d>(() => directionForSelection("path"));
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const wheelRef = useRef<NarrativeWheelHandle>(null);
  const routeRailRef = useRef<RouteRailHandle>(null);
  const constellationWorldRef = useRef<ConstellationWorldHandle>(null);
  const lastUniverseTarget = useRef<{
    slug: DestinationSlug;
    itemSlug?: string;
  } | null>(null);
  const lastProjectTrigger = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef<PendingFocus>(null);
  const pendingProjectOpen = useRef<string | null>(null);
  const selectedProject =
    location.view === "projects" && location.projectSlug
      ? projectBySlug(location.projectSlug)
      : undefined;
  const selectedQuote =
    quotes.find((quote) => quote.slug === selectedQuoteSlug) ?? quotes[0];
  const cameraDestination =
    location.view === "universe"
      ? { x: 50, y: 50 }
      : {
          x: destinationBySlug[location.view].position[0],
          y: destinationBySlug[location.view].position[1],
        };
  const camera = worldCameraFor(location.view, cameraDestination);
  const showHeaderIdentity =
    location.view !== "universe" || !activeStoryId.startsWith("intro/");
  const effectiveWheelCollapsed =
    location.view === "universe" && wheelCollapsed;

  const aimConstellation = useCallback(
    (view: DestinationSlug, toSlug?: string) => {
      const fromSlug =
        view === "path"
          ? selectedPathSlug
          : view === "projects"
            ? selectedProjectSlug
            : selectedQuoteSlug;
      setConstellationDirection(
        directionForSelection(view, fromSlug, toSlug),
      );
    },
    [selectedPathSlug, selectedProjectSlug, selectedQuoteSlug],
  );

  const requestStoryScroll = useCallback(
    (id: string, behavior?: ScrollBehavior) => {
      wheelRef.current?.scrollToBeat(
        id,
        behavior ?? (prefersReducedMotion() ? "auto" : "smooth"),
      );
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
    },
    [],
  );

  const openProject = useCallback(
    (slug: string) => {
      pendingProjectOpen.current = null;
      lastProjectTrigger.current = document.activeElement as HTMLElement | null;
      aimConstellation("projects", slug);
      dispatchPortfolio({ type: "select-item", view: "projects", itemSlug: slug });
      requestStoryScroll(`projects/${slug}`);
      commitLocation({ view: "projects", projectSlug: slug });
    },
    [aimConstellation, commitLocation, requestStoryScroll],
  );

  const enterConstellation = useCallback(
    (view: DestinationSlug, itemSlug?: string) => {
      lastUniverseTarget.current = { slug: view, itemSlug };
      pendingProjectOpen.current = null;
      if (view === "path" && itemSlug) {
        aimConstellation(view, itemSlug);
      } else if (view === "projects" && itemSlug) {
        aimConstellation(view, itemSlug);
        pendingProjectOpen.current = itemSlug;
      } else if (view === "quotes" && itemSlug) {
        aimConstellation(view, itemSlug);
      } else {
        aimConstellation(view);
      }
      const storyId = itemSlug ? `${view}/${itemSlug}` : view;
      dispatchPortfolio({ type: "enter-constellation", view, itemSlug });
      requestStoryScroll(storyId, "auto");
      commitLocation(
        locationFor(view, view === "projects" ? undefined : itemSlug),
        { focus: { type: "heading" } },
      );
    },
    [aimConstellation, commitLocation, requestStoryScroll],
  );

  const returnToUniverse = useCallback(() => {
    const destination = location.view === "universe" ? "path" : location.view;
    const previousTarget = lastUniverseTarget.current;
    pendingProjectOpen.current = null;
    dispatchPortfolio({ type: "return-to-universe" });
    requestStoryScroll("intro/name", "auto");
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

  const closeProject = useCallback(() => {
    dispatchPortfolio({ type: "close-project" });
    commitLocation(
      { view: "projects" },
      { replace: true, focus: { type: "project" } },
    );
  }, [commitLocation]);

  useEffect(() => {
    if (
      prefersReducedMotion() &&
      location.view === "projects" &&
      pendingProjectOpen.current
    ) {
      openProject(pendingProjectOpen.current);
    }
  }, [location, openProject]);

  const selectPath = useCallback(
    (slug: string, scroll = true) => {
      aimConstellation("path", slug);
      dispatchPortfolio({ type: "select-item", view: "path", itemSlug: slug });
      if (scroll) {
        requestStoryScroll(`path/${slug}`);
      }
      commitLocation({ view: "path", pathSlug: slug }, { replace: true });
    },
    [aimConstellation, commitLocation, requestStoryScroll],
  );

  const selectQuote = useCallback(
    (slug: string, scroll = true) => {
      aimConstellation("quotes", slug);
      dispatchPortfolio({ type: "select-item", view: "quotes", itemSlug: slug });
      if (scroll) {
        requestStoryScroll(`quotes/${slug}`);
      }
      commitLocation({ view: "quotes", quoteSlug: slug }, { replace: true });
    },
    [aimConstellation, commitLocation, requestStoryScroll],
  );

  const handleStoryBeat = useCallback(
    (beat: StoryBeat) => {
      if (beat.id === activeStoryId) {
        return;
      }
      pendingProjectOpen.current = null;
      const focusLeavesConstellation =
        location.view !== (beat.kind === "intro" ? "universe" : beat.view) &&
        document.activeElement?.closest(".constellation-map");

      if (beat.kind === "intro") {
        dispatchPortfolio({ type: "focus-beat", beat });
        if (location.view !== "universe") {
          commitLocation(
            { view: "universe" },
            {
              replace: true,
              focus: focusLeavesConstellation
                ? { type: "universe", slug: location.view }
                : undefined,
            },
          );
        }
        return;
      }

      if (beat.kind === "path") {
        aimConstellation(beat.view, beat.itemSlug);
      } else if (beat.kind === "project") {
        aimConstellation(beat.view, beat.itemSlug);
      } else if (beat.kind === "quote") {
        aimConstellation(beat.view, beat.itemSlug);
      } else {
        aimConstellation(beat.view);
      }
      dispatchPortfolio({ type: "focus-beat", beat });
      commitLocation(
        locationFor(
          beat.view,
          beat.kind === "project" || beat.kind === "destination"
            ? undefined
            : beat.itemSlug,
        ),
        {
          replace: true,
          focus: focusLeavesConstellation ? { type: "heading" } : undefined,
        },
      );
    },
    [activeStoryId, aimConstellation, commitLocation, location.view],
  );

  const activateStoryBeat = useCallback(
    (beat: StoryBeat) => {
      if (beat.kind === "intro") {
        returnToUniverse();
      } else if (beat.kind === "destination") {
        enterConstellation(beat.view);
      } else if (beat.kind === "path") {
        if (location.view === "path") {
          selectPath(beat.itemSlug);
        } else {
          enterConstellation("path", beat.itemSlug);
        }
      } else if (beat.kind === "project") {
        if (location.view === "projects") {
          openProject(beat.itemSlug);
        } else {
          enterConstellation("projects", beat.itemSlug);
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
      returnToUniverse,
      selectPath,
      selectQuote,
    ],
  );

  const selectRouteBeat = useCallback(
    (beat: StoryBeat) => {
      const targetView = beat.kind === "intro" ? "universe" : beat.view;
      requestStoryScroll(
        beat.id,
        targetView === location.view ? undefined : "auto",
      );
      if (beat.kind === "intro" && beat.line === "name") {
        returnToUniverse();
      } else {
        handleStoryBeat(beat);
      }
    },
    [handleStoryBeat, location.view, requestStoryScroll, returnToUniverse],
  );

  const finishCameraArrival = useCallback(() => {
    if (pendingProjectOpen.current) {
      openProject(pendingProjectOpen.current);
    }
  }, [openProject]);

  const changeWheelVisibility = useCallback((collapsed: boolean) => {
    setWheelCollapsed(collapsed);
    window.sessionStorage.setItem("narrative-wheel-collapsed", String(collapsed));
  }, []);

  useEffect(() => {
    if (location.view !== "universe" && wheelCollapsed) {
      changeWheelVisibility(false);
    }
  }, [changeWheelVisibility, location.view, wheelCollapsed]);

  const updateRouteProgress = useCallback(
    (progress: number, travel: ConstellationTravel | null) => {
      routeRailRef.current?.setProgress(progress);
      if (
        prefersReducedMotion() ||
        !travel ||
        travel.view !== location.view
      ) {
        constellationWorldRef.current?.setFocusOffset({ x: 0, y: 0 });
        return;
      }
      const items = constellationItems[travel.view];
      const from = travel.fromSlug
        ? items.find(({ slug }) => slug === travel.fromSlug)
        : undefined;
      const to = travel.toSlug
        ? items.find(({ slug }) => slug === travel.toSlug)
        : undefined;
      if ((travel.fromSlug && !from) || (travel.toSlug && !to)) {
        return;
      }
      const focus = constellationFocusPoint(
        from ? { x: from.position[0], y: from.position[1] } : { x: 50, y: 50 },
        to ? { x: to.position[0], y: to.position[1] } : { x: 50, y: 50 },
        travel.progress,
      );
      constellationWorldRef.current?.setFocusOffset(
        constellationFocusOffset(focus),
      );
    },
    [location.view],
  );

  useEffect(() => {
    constellationWorldRef.current?.setFocusOffset({ x: 0, y: 0 });
  }, [location.view]);

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
      const nextStoryId = storyBeatForLocation(nextLocation);
      dispatchPortfolio({ type: "sync-location", location: nextLocation });
      requestStoryScroll(nextStoryId, "auto");
    };

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [requestStoryScroll]);

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
          ? `constellation-star-${target.slug}-${target.itemSlug}`
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

  const constellationView = location.view as Exclude<UniverseView, "universe">;

  return (
    <CelestialScene
      camera={camera}
      constellationDirection={constellationDirection}
      interactive={!selectedProject}
      onOpenSkyWheel={(input) => {
        if (!effectiveWheelCollapsed) {
          wheelRef.current?.scrollBy(input);
        }
      }}
      view={location.view}
    >
      <nav className="site-nav" aria-label="Profile links">
        <span
          aria-hidden={showHeaderIdentity ? undefined : true}
          className="site-nav__identity"
          data-visible={showHeaderIdentity ? "true" : undefined}
        >
          {person.name}
        </span>
        <div className="site-nav__links">
          {person.links.map((link) => (
            <ExternalLink href={link.url} key={link.label}>
              {link.label}
            </ExternalLink>
          ))}
        </div>
      </nav>

      <div
        className="universe-stage"
        data-wheel-collapsed={effectiveWheelCollapsed ? "true" : undefined}
        data-view={location.view}
      >
        <NarrativeWheel
          activeId={activeStoryId}
          beats={storyBeats}
          collapsed={effectiveWheelCollapsed}
          collapsible={location.view === "universe"}
          onActivate={activateStoryBeat}
          onActiveBeat={handleStoryBeat}
          onCollapsedChange={changeWheelVisibility}
          onProgressChange={updateRouteProgress}
          ref={wheelRef}
        />

        <section
          aria-label={location.view === "universe" ? "Universe" : undefined}
          aria-labelledby={
            location.view === "universe" ? undefined : "constellation-view-title"
          }
          className={
            location.view === "universe"
              ? "universe-overview"
              : `constellation-view constellation-view--${constellationView}`
          }
          role="region"
        >
          {location.view !== "universe" ? (
            <>
              <h2
                className="constellation-view__title"
                id="constellation-view-title"
                ref={viewHeading}
                tabIndex={-1}
              >
                {destinationBySlug[constellationView].label} constellation
              </h2>

              {constellationView === "quotes" ? (
                <QuoteReadout
                  hidden={!effectiveWheelCollapsed}
                  quote={selectedQuote}
                />
              ) : null}
            </>
          ) : null}
          <ConstellationWorld
            activeSlugs={{
              path: selectedPathSlug,
              projects: selectedProjectSlug,
              quotes: selectedQuote.slug,
            }}
            destinations={destinations}
            items={constellationItems}
            onEnter={enterConstellation}
            onCameraSettled={finishCameraArrival}
            onSelect={(view, slug) => {
              if (view === "path") {
                selectPath(slug);
              } else if (view === "projects") {
                openProject(slug);
              } else {
                selectQuote(slug);
              }
            }}
            view={location.view}
            ref={constellationWorldRef}
          />
        </section>
      </div>

      <RouteRail
        activeId={activeStoryId}
        beats={storyBeats}
        initialProgress={initialStoryProgress.current}
        onSelect={selectRouteBeat}
        ref={routeRailRef}
      />

      {selectedProject ? (
        <ProjectLens project={selectedProject} onClose={closeProject} />
      ) : null}
    </CelestialScene>
  );
}
