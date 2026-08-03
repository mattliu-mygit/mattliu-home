import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  constellationFocusOffset,
  constellationFocusPoint,
  type Point2d,
  worldCameraFor,
} from "../scene/celestial-motion";
import type { ConstellationWorldHandle } from "../scene/ConstellationWorld";
import type { NarrativeWheelHandle } from "../components/NarrativeWheel";
import type { RouteRailHandle } from "../components/RouteRail";
import { projectBySlug, type DestinationSlug } from "../content/site-content";
import {
  parseUniverseLocation,
  serializeUniverseLocation,
  type UniverseLocation,
} from "./navigation";
import {
  directionForSelection,
  portfolioModel,
} from "./portfolio-model";
import { createPortfolioState, portfolioReducer } from "./portfolio-state";
import {
  storyBeatForLocation,
  type ConstellationTravel,
  type StoryBeat,
} from "./story-navigation";

const { codaByView, constellationItems, destinationBySlug, storyBeats } =
  portfolioModel;

type PendingFocus =
  | { type: "heading" }
  | { type: "universe"; slug: DestinationSlug; itemSlug?: string }
  | { type: "project" }
  | null;

const locationUrl = (location: UniverseLocation) =>
  `${window.location.pathname}${window.location.search}${serializeUniverseLocation(location)}`;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const passiveLocationFor = (
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

const selectedItemLocationFor = (
  view: DestinationSlug,
  itemSlug: string,
): UniverseLocation => {
  if (view === "projects") {
    return { view, projectSlug: itemSlug };
  }
  return passiveLocationFor(view, itemSlug);
};

export const usePortfolioController = () => {
  const initialLocation = useRef(parseUniverseLocation(window.location.hash));
  const [portfolioState, dispatchPortfolio] = useReducer(
    portfolioReducer,
    initialLocation.current,
    createPortfolioState,
  );
  const { location, activeStoryId, selections } = portfolioState;
  const [immersive, setImmersive] = useState(false);
  const [constellationDirection, setConstellationDirection] =
    useState<Point2d>(() =>
      directionForSelection(constellationItems, "path"),
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
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const immersiveButtonRef = useRef<HTMLButtonElement>(null);
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
  const cameraDestination =
    location.view === "universe"
      ? { x: 50, y: 50 }
      : {
          x: destinationBySlug[location.view].position[0],
          y: destinationBySlug[location.view].position[1],
        };
  const camera = worldCameraFor(location.view, cameraDestination);
  const sceneCamera = immersive
    ? worldCameraFor("universe", { x: 50, y: 50 })
    : camera;
  const sceneView = immersive ? "universe" : location.view;
  const showHeaderIdentity =
    location.view !== "universe" || !activeStoryId.startsWith("intro/");

  const aimConstellation = useCallback(
    (view: DestinationSlug, toSlug?: string) => {
      setConstellationDirection(
        directionForSelection(
          constellationItems,
          view,
          selections[view],
          toSlug,
        ),
      );
    },
    [selections],
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
      const isCoda = codaByView[view].slug === itemSlug;
      const focusSlug = view === "projects" && isCoda ? undefined : itemSlug;
      aimConstellation(view, focusSlug);
      if (view === "projects" && itemSlug && !isCoda) {
        pendingProjectOpen.current = itemSlug;
      }
      dispatchPortfolio({ type: "enter-constellation", view, itemSlug });
      requestStoryScroll(itemSlug ? `${view}/${itemSlug}` : view, "auto");
      commitLocation(
        isCoda && itemSlug
          ? selectedItemLocationFor(view, itemSlug)
          : passiveLocationFor(
              view,
              view === "projects" ? undefined : itemSlug,
            ),
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

  const selectNarrativeItem = useCallback(
    (view: "path" | "quotes", slug: string) => {
      aimConstellation(view, slug);
      dispatchPortfolio({ type: "select-item", view, itemSlug: slug });
      requestStoryScroll(`${view}/${slug}`);
      commitLocation(selectedItemLocationFor(view, slug), { replace: true });
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

      aimConstellation(
        beat.view,
        beat.kind === "destination" ? undefined : beat.itemSlug,
      );
      dispatchPortfolio({ type: "focus-beat", beat });
      commitLocation(
        beat.kind === "coda"
          ? selectedItemLocationFor(beat.view, beat.itemSlug)
          : passiveLocationFor(
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
          selectNarrativeItem("path", beat.itemSlug);
        } else {
          enterConstellation("path", beat.itemSlug);
        }
      } else if (beat.kind === "project") {
        if (location.view === "projects") {
          openProject(beat.itemSlug);
        } else {
          enterConstellation("projects", beat.itemSlug);
        }
      } else if (beat.kind === "coda") {
        if (location.view === beat.view) {
          aimConstellation(beat.view, beat.itemSlug);
          dispatchPortfolio({ type: "focus-beat", beat });
          requestStoryScroll(beat.id);
          commitLocation(selectedItemLocationFor(beat.view, beat.itemSlug), {
            replace: true,
          });
        } else {
          enterConstellation(beat.view, beat.itemSlug);
        }
      } else if (location.view === "quotes") {
        selectNarrativeItem("quotes", beat.itemSlug);
      } else {
        enterConstellation("quotes", beat.itemSlug);
      }
    },
    [
      aimConstellation,
      commitLocation,
      enterConstellation,
      location.view,
      openProject,
      requestStoryScroll,
      returnToUniverse,
      selectNarrativeItem,
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

  const updateRouteProgress = useCallback(
    (progress: number, travel: ConstellationTravel | null) => {
      routeRailRef.current?.setProgress(progress);
      if (prefersReducedMotion() || !travel || travel.view !== location.view) {
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

  const toggleImmersive = useCallback(() => {
    pendingProjectOpen.current = null;
    setImmersive((active) => !active);
  }, []);

  const onOpenSkyWheel = useCallback(
    (input: Parameters<NarrativeWheelHandle["scrollBy"]>[0]) => {
      if (!immersive) {
        wheelRef.current?.scrollBy(input);
      }
    },
    [immersive],
  );

  const selectConstellationItem = useCallback(
    (view: DestinationSlug, slug: string) => {
      if (codaByView[view].slug === slug) {
        const beat = storyBeats.find(
          (candidate) => candidate.id === `${view}/${slug}`,
        );
        if (beat) {
          activateStoryBeat(beat);
        }
      } else if (view === "path") {
        selectNarrativeItem("path", slug);
      } else if (view === "projects") {
        openProject(slug);
      } else {
        selectNarrativeItem("quotes", slug);
      }
    },
    [activateStoryBeat, openProject, selectNarrativeItem],
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
      dispatchPortfolio({ type: "sync-location", location: nextLocation });
      requestStoryScroll(storyBeatForLocation(nextLocation), "auto");
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
      } else if (immersive) {
        immersiveButtonRef.current?.focus();
        setImmersive(false);
      } else if (location.view !== "universe") {
        returnToUniverse();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeProject, immersive, location, returnToUniverse]);

  return {
    actions: {
      activateStoryBeat,
      closeProject,
      enterConstellation,
      finishCameraArrival,
      handleStoryBeat,
      onOpenSkyWheel,
      selectConstellationItem,
      selectRouteBeat,
      toggleImmersive,
      updateRouteProgress,
    },
    refs: {
      constellationWorldRef,
      immersiveButtonRef,
      routeRailRef,
      viewHeading,
      wheelRef,
    },
    scene: {
      constellationDirection,
      sceneCamera,
      sceneView,
    },
    state: {
      activeStoryId,
      immersive,
      initialStoryProgress: initialStoryProgress.current,
      location,
      selectedProject,
      selections,
      showHeaderIdentity,
    },
  };
};
