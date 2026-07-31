import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import {
  cameraTravelVector,
  type Point2d,
} from "./celestial-motion";
import { CelestialScene } from "./components/CelestialScene";
import {
  type ConstellationItem,
} from "./components/ConstellationMap";
import { ConstellationWorld } from "./components/ConstellationWorld";
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
  type Point,
} from "./content/site-content";
import {
  parseUniverseLocation,
  serializeUniverseLocation,
  type UniverseLocation,
  type UniverseView,
} from "./navigation";
import {
  createStoryBeats,
  storyBeatForLocation,
  type StoryBeat,
} from "./story-navigation";
import { runViewTransition } from "./view-transition";

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
  const [location, setLocation] = useState(initialLocation.current);
  const [selectedPathSlug, setSelectedPathSlug] = useState(
    initialLocation.current.view === "path"
      ? initialLocation.current.pathSlug
      : path[0].slug,
  );
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<
    string | undefined
  >(
    initialLocation.current.view === "projects"
      ? initialLocation.current.projectSlug
      : undefined,
  );
  const [selectedQuoteSlug, setSelectedQuoteSlug] = useState(
    initialLocation.current.view === "quotes"
      ? (initialLocation.current.quoteSlug ?? quotes[0].slug)
      : quotes[0].slug,
  );
  const [cameraOrigin, setCameraOrigin] = useState<Point>(() =>
    initialLocation.current.view === "universe"
      ? [50, 50]
      : destinationBySlug[initialLocation.current.view].position,
  );
  const [activeStoryId, setActiveStoryId] = useState(() =>
    storyBeatForLocation(initialLocation.current),
  );
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
  const [cameraTransition, setCameraTransition] = useState<
    "arrive" | "pan" | "settled"
  >("arrive");
  const [cameraPan, setCameraPan] = useState<Point2d>({ x: 0, y: 0 });
  const [constellationDirection, setConstellationDirection] =
    useState<Point2d>(() => directionForSelection("path"));
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const wheelRef = useRef<NarrativeWheelHandle>(null);
  const routeRailRef = useRef<RouteRailHandle>(null);
  const lastUniverseTarget = useRef<{
    slug: DestinationSlug;
    itemSlug?: string;
  } | null>(null);
  const lastProjectTrigger = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef<PendingFocus>(null);
  const pendingProjectOpen = useRef<string | null>(null);
  const spatialTransitionRequest = useRef(0);
  const selectedProject =
    location.view === "projects" && location.projectSlug
      ? projectBySlug(location.projectSlug)
      : undefined;
  const selectedQuote =
    quotes.find((quote) => quote.slug === selectedQuoteSlug) ?? quotes[0];

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
      setLocation(nextLocation);
    },
    [],
  );

  const configureCamera = useCallback(
    (nextView: DestinationSlug, origin?: Point) => {
      setCameraOrigin(origin ?? destinationBySlug[nextView].position);
      const previousView = location.view;
      const shouldPan = previousView !== "universe" && previousView !== nextView;
      setCameraTransition(
        shouldPan
          ? "pan"
          : previousView === "universe"
            ? "arrive"
            : "settled",
      );
      if (shouldPan) {
        const previous = destinationBySlug[previousView].position;
        const next = destinationBySlug[nextView].position;
        setCameraPan(
          cameraTravelVector(
            { x: previous[0], y: previous[1] },
            { x: next[0], y: next[1] },
          ),
        );
      }
    },
    [location.view],
  );

  const openProject = useCallback(
    (slug: string) => {
      pendingProjectOpen.current = null;
      lastProjectTrigger.current = document.activeElement as HTMLElement | null;
      aimConstellation("projects", slug);
      setSelectedProjectSlug(slug);
      setActiveStoryId(`projects/${slug}`);
      requestStoryScroll(`projects/${slug}`);
      commitLocation({ view: "projects", projectSlug: slug });
    },
    [aimConstellation, commitLocation, requestStoryScroll],
  );

  const runSpatialUpdate = useCallback(
    (
      update: () => void,
      target: DestinationSlug,
      onFinished?: () => void,
    ) => {
      const request = ++spatialTransitionRequest.current;
      const transition = runViewTransition(
        document,
        () => flushSync(update),
        !prefersReducedMotion(),
        target,
      );
      if (transition && onFinished) {
        void transition.finished.then(
          () => {
            if (request === spatialTransitionRequest.current) {
              onFinished();
            }
          },
          () => undefined,
        );
      }
      return transition;
    },
    [],
  );

  const enterConstellation = useCallback(
    (view: DestinationSlug, itemSlug?: string, origin?: Point) => {
      const update = () => {
        lastUniverseTarget.current = { slug: view, itemSlug };
        configureCamera(view, origin);
        pendingProjectOpen.current = null;
        if (view === "path" && itemSlug) {
          aimConstellation(view, itemSlug);
          setSelectedPathSlug(itemSlug);
        } else if (view === "projects" && itemSlug) {
          aimConstellation(view, itemSlug);
          setSelectedProjectSlug(itemSlug);
          pendingProjectOpen.current = itemSlug;
        } else if (view === "quotes" && itemSlug) {
          aimConstellation(view, itemSlug);
          setSelectedQuoteSlug(itemSlug);
        } else {
          aimConstellation(view);
        }
        const storyId = itemSlug ? `${view}/${itemSlug}` : view;
        setActiveStoryId(storyId);
        requestStoryScroll(storyId, "auto");
        commitLocation(
          locationFor(view, view === "projects" ? undefined : itemSlug),
          { focus: { type: "heading" } },
        );
      };
      if (location.view !== "universe") {
        update();
        return;
      }
      runSpatialUpdate(
        update,
        view,
        () => {
          const pendingSlug = pendingProjectOpen.current;
          if (pendingSlug) {
            openProject(pendingSlug);
          }
        },
      );
    },
    [
      commitLocation,
      configureCamera,
      location.view,
      aimConstellation,
      openProject,
      requestStoryScroll,
      runSpatialUpdate,
    ],
  );

  const returnToUniverse = useCallback(() => {
    const destination = location.view === "universe" ? "path" : location.view;
    const previousTarget = lastUniverseTarget.current;
    const update = () => {
      pendingProjectOpen.current = null;
      setCameraTransition("arrive");
      setActiveStoryId("intro/name");
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
    };
    if (location.view === "universe") {
      update();
    } else {
      runSpatialUpdate(update, destination);
    }
  }, [commitLocation, location.view, requestStoryScroll, runSpatialUpdate]);

  const closeProject = useCallback(() => {
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
      setSelectedPathSlug(slug);
      setActiveStoryId(`path/${slug}`);
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
      setSelectedQuoteSlug(slug);
      setActiveStoryId(`quotes/${slug}`);
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
      setActiveStoryId(beat.id);

      if (beat.kind === "intro") {
        if (location.view !== "universe") {
          runSpatialUpdate(
            () => {
              setCameraTransition("arrive");
              commitLocation({ view: "universe" }, { replace: true });
            },
            location.view,
          );
        }
        return;
      }

      const update = () => {
        configureCamera(beat.view);
        if (beat.kind === "path") {
          aimConstellation(beat.view, beat.itemSlug);
          setSelectedPathSlug(beat.itemSlug);
        } else if (beat.kind === "project") {
          aimConstellation(beat.view, beat.itemSlug);
          setSelectedProjectSlug(beat.itemSlug);
        } else if (beat.kind === "quote") {
          aimConstellation(beat.view, beat.itemSlug);
          setSelectedQuoteSlug(beat.itemSlug);
        } else {
          aimConstellation(beat.view);
        }
        commitLocation(
          locationFor(
            beat.view,
            beat.kind === "project" || beat.kind === "destination"
              ? undefined
              : beat.itemSlug,
          ),
          { replace: true },
        );
      };
      if (location.view === "universe") {
        runSpatialUpdate(update, beat.view);
      } else {
        update();
      }
    },
    [
      activeStoryId,
      aimConstellation,
      commitLocation,
      configureCamera,
      location.view,
      runSpatialUpdate,
    ],
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

  const finishCameraArrival = useCallback(
    (event: React.AnimationEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || !pendingProjectOpen.current) {
        return;
      }
      openProject(pendingProjectOpen.current);
    },
    [openProject],
  );

  const changeWheelVisibility = useCallback((collapsed: boolean) => {
    setWheelCollapsed(collapsed);
    window.sessionStorage.setItem("narrative-wheel-collapsed", String(collapsed));
  }, []);

  const updateRouteProgress = useCallback((progress: number) => {
    routeRailRef.current?.setProgress(progress);
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
      spatialTransitionRequest.current += 1;
      if (nextLocation.view === "path" && nextLocation.pathSlug) {
        setSelectedPathSlug(nextLocation.pathSlug);
      } else if (nextLocation.view === "projects" && nextLocation.projectSlug) {
        setSelectedProjectSlug(nextLocation.projectSlug);
      } else if (nextLocation.view === "quotes" && nextLocation.quoteSlug) {
        setSelectedQuoteSlug(nextLocation.quoteSlug);
      }
      if (nextLocation.view !== "universe") {
        setCameraOrigin(destinationBySlug[nextLocation.view].position);
        setCameraTransition("arrive");
      }
      const nextStoryId = storyBeatForLocation(nextLocation);
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
      cameraOrigin={cameraOrigin}
      constellationDirection={constellationDirection}
      interactive={!selectedProject}
      onOpenSkyWheel={(input) => {
        if (!wheelCollapsed) {
          wheelRef.current?.scrollBy(input);
        }
      }}
      view={location.view}
    >
      <nav className="site-nav" aria-label="Profile links">
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
        data-wheel-collapsed={wheelCollapsed ? "true" : undefined}
        data-view={location.view}
      >
        <NarrativeWheel
          activeId={activeStoryId}
          beats={storyBeats}
          collapsed={wheelCollapsed}
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
          data-camera-transition={
            location.view === "universe" ? undefined : cameraTransition
          }
          onAnimationEnd={finishCameraArrival}
          role="region"
          style={
            {
              "--camera-pan-x": `${cameraPan.x}vw`,
              "--camera-pan-y": `${cameraPan.y}vh`,
            } as CSSProperties
          }
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
              <QuoteReadout hidden={!wheelCollapsed} quote={selectedQuote} />
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
