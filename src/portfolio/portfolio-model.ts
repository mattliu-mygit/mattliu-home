import type { Point2d } from "../universe/motion/celestial-motion";
import type { ConstellationItem } from "../universe/constellations/ConstellationMap";
import {
  siteContent,
  type DestinationSlug,
  type SiteContent,
} from "../content/site-content";
import { createStoryBeats } from "./story-navigation";

type ConstellationSource = Pick<
  ConstellationItem,
  "slug" | "position" | "depth" | "tone" | "prominence"
>;

type ConstellationCopy = Pick<ConstellationItem, "label" | "meta"> &
  Partial<Pick<ConstellationItem, "overviewLabel" | "coda">>;

const constellationItem = (
  { slug, position, depth, tone, prominence }: ConstellationSource,
  copy: ConstellationCopy,
): ConstellationItem => ({
  slug,
  position,
  depth,
  tone,
  prominence,
  ...copy,
});

export const createPortfolioModel = (content: SiteContent) => {
  const codaByView = Object.fromEntries(
    content.codas.map((coda) => [coda.view, coda]),
  ) as Record<DestinationSlug, (typeof content.codas)[number]>;
  const destinationBySlug = Object.fromEntries(
    content.destinations.map((destination) => [destination.slug, destination]),
  ) as Record<DestinationSlug, (typeof content.destinations)[number]>;

  const codaItem = (view: DestinationSlug): ConstellationItem => {
    const coda = codaByView[view];
    return constellationItem(coda, {
      label: coda.text,
      overviewLabel: coda.shortLabel,
      meta: coda.shortLabel,
      coda: true,
    });
  };

  const constellationItems: Record<
    DestinationSlug,
    readonly ConstellationItem[]
  > = {
    path: [
      ...content.path.map((entry) =>
        constellationItem(entry, {
          label: entry.organization,
          overviewLabel: entry.shortLabel,
          meta: entry.period,
        }),
      ),
      codaItem("path"),
    ],
    projects: [
      ...content.projects.map((project) =>
        constellationItem(project, { label: project.title }),
      ),
      codaItem("projects"),
    ],
    quotes: [
      ...content.quotes.map((quote) =>
        constellationItem(quote, {
          label: quote.text,
          overviewLabel: quote.text,
          meta: quote.author,
        }),
      ),
      codaItem("quotes"),
    ],
  };

  return {
    content,
    codaByView,
    constellationItems,
    destinationBySlug,
    storyBeats: createStoryBeats(content),
  };
};

export const directionForSelection = (
  constellationItems: Record<DestinationSlug, readonly ConstellationItem[]>,
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

export const portfolioModel = createPortfolioModel(siteContent);
