import type {
  DestinationSlug,
  ConstellationCoda,
  PathEntry,
  Project,
  Quote,
  SiteContent,
} from "../content/site-content";
import type { UniverseLocation } from "./navigation";

export type StoryBeat =
  | {
      id: "intro/name" | "intro/headline" | "intro/context";
      kind: "intro";
      view: "universe";
      line: "name" | "headline" | "context";
      content: string;
      kicker?: string;
    }
  | {
      id: `path/${string}`;
      kind: "path";
      view: "path";
      itemSlug: string;
      entry: PathEntry;
    }
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
    }
  | {
      id: `${DestinationSlug}/${string}`;
      kind: "coda";
      view: DestinationSlug;
      itemSlug: string;
      coda: ConstellationCoda;
    };

export type ConstellationTravel = {
  view: DestinationSlug;
  fromSlug?: string;
  toSlug?: string;
  progress: number;
};

const itemBeat = (
  beat: StoryBeat,
): beat is Extract<
  StoryBeat,
  { kind: "path" | "project" | "quote" | "coda" }
> =>
  beat.kind === "path" ||
  beat.kind === "project" ||
  beat.kind === "quote" ||
  beat.kind === "coda";

const codaBeat = (content: SiteContent, view: DestinationSlug): StoryBeat => {
  const coda = content.codas.find((candidate) => candidate.view === view);
  if (!coda) {
    throw new Error(`Missing ${view} coda`);
  }
  return {
    id: `${view}/${coda.slug}`,
    kind: "coda",
    view,
    itemSlug: coda.slug,
    coda,
  };
};

export const createStoryBeats = (
  content: SiteContent,
): readonly StoryBeat[] => [
  {
    id: "intro/name",
    kind: "intro",
    view: "universe",
    line: "name",
    content: content.person.name,
    kicker: `${content.person.role} · ${content.person.location.split(",")[0]}`,
  },
  {
    id: "intro/headline",
    kind: "intro",
    view: "universe",
    line: "headline",
    content: content.person.headline,
  },
  {
    id: "intro/context",
    kind: "intro",
    view: "universe",
    line: "context",
    content: content.person.introduction,
  },
  { id: "path", kind: "destination", view: "path" },
  ...content.path.map((entry) => ({
    id: `path/${entry.slug}` as const,
    kind: "path" as const,
    view: "path" as const,
    itemSlug: entry.slug,
    entry,
  })),
  codaBeat(content, "path"),
  { id: "projects", kind: "destination", view: "projects" },
  ...content.projects.map((project) => ({
    id: `projects/${project.slug}` as const,
    kind: "project" as const,
    view: "projects" as const,
    itemSlug: project.slug,
    project,
  })),
  codaBeat(content, "projects"),
  { id: "quotes", kind: "destination", view: "quotes" },
  ...content.quotes.map((quote) => ({
    id: `quotes/${quote.slug}` as const,
    kind: "quote" as const,
    view: "quotes" as const,
    itemSlug: quote.slug,
    quote,
  })),
  codaBeat(content, "quotes"),
];

export const storyBeatForLocation = (
  location: UniverseLocation,
) => {
  if (location.view === "universe") {
    return "intro/name";
  }
  if (location.view === "path" && location.pathSlug) {
    return `path/${location.pathSlug}`;
  }
  if (location.view === "projects" && location.projectSlug) {
    return `projects/${location.projectSlug}`;
  }
  if (location.view === "quotes" && location.quoteSlug) {
    return `quotes/${location.quoteSlug}`;
  }
  return location.view;
};

export type RouteMark = {
  id: string;
  label: string;
  accessibleLabel: string;
  major: boolean;
  beat: StoryBeat;
};

const routeLabel = (beat: StoryBeat) => {
  if (beat.kind === "intro") {
    return beat.line === "name"
      ? "Intro"
      : beat.line === "headline"
        ? "Principle"
        : "Context";
  }
  if (beat.kind === "destination") {
    return `${beat.view[0].toUpperCase()}${beat.view.slice(1)}`;
  }
  if (beat.kind === "path") {
    return beat.entry.shortLabel;
  }
  if (beat.kind === "project") {
    return beat.project.title;
  }
  if (beat.kind === "coda") {
    return beat.coda.shortLabel;
  }
  return beat.quote.author;
};

export const createRouteMarks = (
  beats: readonly StoryBeat[],
): readonly RouteMark[] =>
  beats.map((beat) => {
    const label = routeLabel(beat);
    return {
      id: beat.id,
      label,
      accessibleLabel:
        beat.kind === "quote"
          ? `Go to quote by ${beat.quote.author}: ${beat.quote.text}`
          : `Go to ${label}`,
      major:
        (beat.kind === "intro" && beat.line === "name") ||
        beat.kind === "destination",
      beat,
    };
  });

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

export const interpolatedStoryProgress = (
  entries: readonly { center: number }[],
  viewportCenter: number,
) => {
  if (entries.length <= 1 || viewportCenter <= (entries[0]?.center ?? 0)) {
    return 0;
  }
  const lastIndex = entries.length - 1;
  if (viewportCenter >= entries[lastIndex].center) {
    return 1;
  }
  const beforeIndex = entries.findIndex(
    (entry) => entry.center >= viewportCenter,
  ) - 1;
  const before = entries[beforeIndex];
  const after = entries[beforeIndex + 1];
  const segment = (viewportCenter - before.center) / (after.center - before.center);
  return (beforeIndex + segment) / lastIndex;
};

export const constellationTravelAtProgress = (
  beats: readonly StoryBeat[],
  progress: number,
): ConstellationTravel | null => {
  if (beats.length < 2) {
    return null;
  }
  const boundedProgress = Math.min(1, Math.max(0, progress));
  const position = boundedProgress * (beats.length - 1);
  const fromIndex = Math.floor(position);
  const toIndex = Math.min(beats.length - 1, fromIndex + 1);
  const from = beats[fromIndex];
  const to = beats[toIndex];
  const segmentProgress = position - fromIndex;
  if (fromIndex === toIndex) {
    return itemBeat(from)
      ? {
          view: from.view,
          fromSlug: from.itemSlug,
          toSlug: from.itemSlug,
          progress: 0,
        }
      : null;
  }
  if (itemBeat(from) && itemBeat(to) && from.view === to.view) {
    return {
      view: from.view,
      fromSlug: from.itemSlug,
      toSlug: to.itemSlug,
      progress: segmentProgress,
    };
  }
  if (from.kind === "destination" && itemBeat(to) && from.view === to.view) {
    return {
      view: from.view,
      toSlug: to.itemSlug,
      progress: segmentProgress,
    };
  }
  if (itemBeat(from) && to.kind === "destination") {
    return {
      view: from.view,
      fromSlug: from.itemSlug,
      progress: Math.min(1, segmentProgress * 2),
    };
  }
  return null;
};

export const routeMarkerPosition = (progress: number, count: number) => {
  if (count <= 0) {
    return 50;
  }
  const boundedProgress = Math.min(1, Math.max(0, progress));
  return ((boundedProgress * Math.max(0, count - 1) + 0.5) / count) * 100;
};

export type RouteChapter = {
  label: "Intro" | "Path" | "Projects" | "Quotes" | "Fin";
  position: number;
};

const chapterDefinitions = [
  { label: "Intro", view: "universe" },
  { label: "Path", view: "path" },
  { label: "Projects", view: "projects" },
  { label: "Quotes", view: "quotes" },
] as const;

export const createRouteChapters = (
  beats: readonly StoryBeat[],
): readonly RouteChapter[] => {
  if (beats.length === 0) {
    return [];
  }

  const positionForIndex = (index: number) =>
    routeMarkerPosition(
      beats.length === 1 ? 0 : index / (beats.length - 1),
      beats.length,
  );
  const chapters = chapterDefinitions.flatMap(({ label, view }) => {
    const firstIndex = beats.findIndex((beat) => beat.view === view);
    return firstIndex < 0
      ? []
      : [
          {
            label,
            position: positionForIndex(firstIndex),
          },
        ];
  });

  return [
    ...chapters,
    { label: "Fin", position: positionForIndex(beats.length - 1) },
  ];
};
