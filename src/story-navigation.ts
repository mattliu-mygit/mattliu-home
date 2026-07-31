import type {
  DestinationSlug,
  Project,
  Quote,
  SiteContent,
} from "./content/site-content";
import type { UniverseLocation } from "./navigation";

export type StoryBeat =
  | { id: "intro"; kind: "intro"; view: "universe" }
  | {
      id: DestinationSlug;
      kind: "destination";
      view: DestinationSlug;
    }
  | {
      id: `projects/${string}`;
      kind: "project";
      view: "projects";
      itemSlug: string;
      project: Project;
    }
  | {
      id: `quotes/${string}`;
      kind: "quote";
      view: "quotes";
      itemSlug: string;
      quote: Quote;
    };

export const createStoryBeats = (
  content: SiteContent,
): readonly StoryBeat[] => [
  { id: "intro", kind: "intro", view: "universe" },
  { id: "projects", kind: "destination", view: "projects" },
  ...content.projects.map((project) => ({
    id: `projects/${project.slug}` as const,
    kind: "project" as const,
    view: "projects" as const,
    itemSlug: project.slug,
    project,
  })),
  { id: "quotes", kind: "destination", view: "quotes" },
  ...content.quotes.map((quote) => ({
    id: `quotes/${quote.slug}` as const,
    kind: "quote" as const,
    view: "quotes" as const,
    itemSlug: quote.slug,
    quote,
  })),
];

export const storyBeatForLocation = (
  location: UniverseLocation,
  selectedQuoteSlug?: string,
) => {
  if (location.view === "universe") {
    return "intro";
  }
  if (location.view === "projects" && location.projectSlug) {
    return `projects/${location.projectSlug}`;
  }
  if (location.view === "quotes" && selectedQuoteSlug) {
    return `quotes/${selectedQuoteSlug}`;
  }
  return location.view;
};

export const centeredStoryBeat = (
  entries: readonly { id: string; center: number }[],
  viewportCenter: number,
) => {
  if (entries.length === 0) {
    return undefined;
  }

  return entries.reduce((nearest, entry) =>
    Math.abs(entry.center - viewportCenter) <
    Math.abs(nearest.center - viewportCenter)
      ? entry
      : nearest,
  ).id;
};
