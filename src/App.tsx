import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { CelestialScene } from "./components/CelestialScene";
import {
  ConstellationMap,
  type ConstellationItem,
} from "./components/ConstellationMap";
import {
  NarrativeWheel,
  type NarrativeWheelHandle,
} from "./components/NarrativeWheel";
import { ProjectLens } from "./components/ProjectLens";
import { QuoteReadout } from "./components/QuoteReadout";
import { RouteRail } from "./components/RouteRail";
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
  })),
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

const viewOrder: Record<DestinationSlug, number> = {
  path: 0,
  projects: 1,
  quotes: 2,
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
  const [wheelCollapsed, setWheelCollapsed] = useState(
    () => window.sessionStorage.getItem("narrative-wheel-collapsed") === "true",
  );
  const [cameraTransition, setCameraTransition] = useState<"arrive" | "pan">(
    "arrive",
  );
  const [cameraPan, setCameraPan] = useState<"forward" | "back">("forward");
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const wheelRef = useRef<NarrativeWheelHandle>(null);
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
      setCameraTransition(shouldPan ? "pan" : "arrive");
      if (shouldPan) {
        setCameraPan(
          viewOrder[nextView] > viewOrder[previousView] ? "forward" : "back",
        );
      }
    },
    [location.view],
  );

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

  const runSpatialUpdate = useCallback(
    (update: () => void, onFinished?: () => void) => {
      const request = ++spatialTransitionRequest.current;
      const transition = runViewTransition(
        document,
        () => flushSync(update),
        !prefersReducedMotion(),
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
          setSelectedPathSlug(itemSlug);
        } else if (view === "projects" && itemSlug) {
          setSelectedProjectSlug(itemSlug);
          pendingProjectOpen.current = itemSlug;
        } else if (view === "quotes" && itemSlug) {
          setSelectedQuoteSlug(itemSlug);
        }
        const storyId = itemSlug ? `${view}/${itemSlug}` : view;
        setActiveStoryId(storyId);
        requestStoryScroll(storyId);
        commitLocation(
          locationFor(view, view === "projects" ? undefined : itemSlug),
          { focus: { type: "heading" } },
        );
      };
      if (location.view !== "universe") {
        update();
        return;
      }
      runSpatialUpdate(update, () => {
        const pendingSlug = pendingProjectOpen.current;
        if (pendingSlug) {
          openProject(pendingSlug);
        }
      });
    },
    [
      commitLocation,
      configureCamera,
      location.view,
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
      requestStoryScroll("intro/name");
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
      runSpatialUpdate(update);
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
      setSelectedPathSlug(slug);
      setActiveStoryId(`path/${slug}`);
      if (scroll) {
        requestStoryScroll(`path/${slug}`);
      }
      commitLocation({ view: "path", pathSlug: slug }, { replace: true });
    },
    [commitLocation, requestStoryScroll],
  );

  const selectQuote = useCallback(
    (slug: string, scroll = true) => {
      setSelectedQuoteSlug(slug);
      setActiveStoryId(`quotes/${slug}`);
      if (scroll) {
        requestStoryScroll(`quotes/${slug}`);
      }
      commitLocation({ view: "quotes", quoteSlug: slug }, { replace: true });
    },
    [commitLocation, requestStoryScroll],
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
          runSpatialUpdate(() => {
            setCameraTransition("arrive");
            commitLocation({ view: "universe" }, { replace: true });
          });
        }
        return;
      }

      const update = () => {
        configureCamera(beat.view);
        if (beat.kind === "path") {
          setSelectedPathSlug(beat.itemSlug);
        } else if (beat.kind === "project") {
          setSelectedProjectSlug(beat.itemSlug);
        } else if (beat.kind === "quote") {
          setSelectedQuoteSlug(beat.itemSlug);
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
        runSpatialUpdate(update);
      } else {
        update();
      }
    },
    [
      activeStoryId,
      commitLocation,
      configureCamera,
      location.view,
      runSpatialUpdate,
    ],
  );

  const activateStoryBeat = useCallback(
    (beat: StoryBeat) => {
      requestStoryScroll(beat.id);
      if (beat.kind === "intro") {
        returnToUniverse();
      } else if (beat.kind === "destination") {
        enterConstellation(beat.view);
      } else if (beat.kind === "path") {
        if (location.view === "path") {
          selectPath(beat.itemSlug, false);
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
        selectQuote(beat.itemSlug, false);
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
      selectPath,
      selectQuote,
    ],
  );

  const selectRouteBeat = useCallback(
    (beat: StoryBeat) => {
      requestStoryScroll(beat.id);
      if (beat.kind === "intro" && beat.line === "name") {
        returnToUniverse();
      } else {
        handleStoryBeat(beat);
      }
    },
    [handleStoryBeat, requestStoryScroll, returnToUniverse],
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

  const constellationView = location.view as Exclude<UniverseView, "universe">;

  return (
    <CelestialScene
      cameraOrigin={cameraOrigin}
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
          ref={wheelRef}
        />

        {location.view === "universe" ? (
          <UniverseOverview
            destinations={destinations}
            items={constellationItems}
            onSelect={enterConstellation}
          />
        ) : (
          <section
            className={`constellation-view constellation-view--${constellationView}`}
            data-camera-pan={cameraPan}
            data-camera-transition={cameraTransition}
            onAnimationEnd={finishCameraArrival}
            role="region"
            aria-labelledby="constellation-view-title"
            key={constellationView}
          >
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
            <ConstellationMap
              kind={constellationView}
              items={constellationItems[constellationView]}
              connections={destinationBySlug[constellationView].connections}
              activeSlug={
                constellationView === "path"
                  ? selectedPathSlug
                  : constellationView === "projects"
                    ? selectedProjectSlug
                    : selectedQuote.slug
              }
              getAccessibleName={(item) =>
                constellationView === "quotes"
                  ? `Read quote: ${item.label}`
                  : constellationView === "path"
                    ? `Focus ${item.label}`
                    : `Explore ${item.label}`
              }
              onSelect={(slug) => {
                if (constellationView === "path") {
                  selectPath(slug);
                } else if (constellationView === "projects") {
                  openProject(slug);
                } else {
                  selectQuote(slug);
                }
              }}
            />
          </section>
        )}
      </div>

      <RouteRail
        activeId={activeStoryId}
        beats={storyBeats}
        onSelect={selectRouteBeat}
      />

      {selectedProject ? (
        <ProjectLens project={selectedProject} onClose={closeProject} />
      ) : null}
    </CelestialScene>
  );
}
