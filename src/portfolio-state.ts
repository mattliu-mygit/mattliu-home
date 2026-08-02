import { siteContent, type DestinationSlug } from "./content/site-content";
import type { UniverseLocation } from "./navigation";
import { storyBeatForLocation, type StoryBeat } from "./story-navigation";

export type PortfolioState = {
  location: UniverseLocation;
  activeStoryId: string;
  selections: {
    path: string;
    projects: string | undefined;
    quotes: string;
  };
};

export type PortfolioAction =
  | { type: "sync-location"; location: UniverseLocation }
  | { type: "focus-beat"; beat: StoryBeat }
  | {
      type: "enter-constellation";
      view: DestinationSlug;
      itemSlug?: string;
    }
  | { type: "select-item"; view: DestinationSlug; itemSlug: string }
  | { type: "close-project" }
  | { type: "return-to-universe" };

const locationFor = (
  view: DestinationSlug,
  itemSlug?: string,
): UniverseLocation => {
  if (view === "path") {
    return { view, pathSlug: itemSlug };
  }
  if (view === "projects") {
    return { view, projectSlug: itemSlug };
  }
  return { view, quoteSlug: itemSlug };
};

const selectionsForLocation = (
  selections: PortfolioState["selections"],
  location: UniverseLocation,
): PortfolioState["selections"] => {
  if (location.view === "path" && location.pathSlug) {
    return { ...selections, path: location.pathSlug };
  }
  if (location.view === "projects" && location.projectSlug) {
    return { ...selections, projects: location.projectSlug };
  }
  if (location.view === "quotes" && location.quoteSlug) {
    return { ...selections, quotes: location.quoteSlug };
  }
  return selections;
};

const selectionsForBeat = (
  selections: PortfolioState["selections"],
  beat: StoryBeat,
): PortfolioState["selections"] => {
  if ("itemSlug" in beat) {
    return { ...selections, [beat.view]: beat.itemSlug };
  }
  return selections;
};

export const createPortfolioState = (
  location: UniverseLocation,
): PortfolioState => ({
  location,
  activeStoryId: storyBeatForLocation(location),
  selections: selectionsForLocation(
    {
      path: siteContent.path[0].slug,
      projects: undefined,
      quotes: siteContent.quotes[0].slug,
    },
    location,
  ),
});

export const portfolioReducer = (
  state: PortfolioState,
  action: PortfolioAction,
): PortfolioState => {
  switch (action.type) {
    case "sync-location":
      return {
        location: action.location,
        activeStoryId: storyBeatForLocation(action.location),
        selections: selectionsForLocation(state.selections, action.location),
      };
    case "focus-beat": {
      const location =
        action.beat.kind === "intro"
          ? { view: "universe" as const }
          : action.beat.kind === "project" || action.beat.kind === "destination"
            ? locationFor(action.beat.view)
            : locationFor(action.beat.view, action.beat.itemSlug);
      return {
        location,
        activeStoryId: action.beat.id,
        selections: selectionsForBeat(state.selections, action.beat),
      };
    }
    case "enter-constellation": {
      const location = locationFor(
        action.view,
        action.view === "projects" ? undefined : action.itemSlug,
      );
      return {
        location,
        activeStoryId: action.itemSlug
          ? `${action.view}/${action.itemSlug}`
          : action.view,
        selections: action.itemSlug
          ? selectionsForLocation(
              state.selections,
              locationFor(action.view, action.itemSlug),
            )
          : state.selections,
      };
    }
    case "select-item": {
      const location = locationFor(action.view, action.itemSlug);
      return {
        location,
        activeStoryId: `${action.view}/${action.itemSlug}`,
        selections: selectionsForLocation(state.selections, location),
      };
    }
    case "close-project":
      return {
        location: { view: "projects" },
        activeStoryId: state.activeStoryId,
        selections: state.selections,
      };
    case "return-to-universe":
      return {
        location: { view: "universe" },
        activeStoryId: "intro/name",
        selections: state.selections,
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
};
