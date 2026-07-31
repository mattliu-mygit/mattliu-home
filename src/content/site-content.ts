import rawSiteContent from "./site-content.json";

export type Point = readonly [x: number, y: number];
export type Connection = readonly [from: string, to: string];
export type DestinationSlug = "path" | "projects" | "quotes";
export type ArtifactType =
  | "ucredit"
  | "customization"
  | "judge"
  | "trace"
  | "interface";
export type StarTone = "warm" | "neutral" | "cool" | "violet";
export type StarProminence = 1 | 2 | 3;

export type PublicLink = {
  label: string;
  url: string;
};

export type Project = {
  slug: string;
  title: string;
  year: number;
  displayYear: string;
  question: string;
  description: string;
  contribution: string;
  technologies: readonly string[];
  repositoryUrl?: string;
  linkLabel?: string;
  artifact: ArtifactType;
  position: Point;
  depth: number;
  tone: StarTone;
  prominence: StarProminence;
};

export type Quote = {
  slug: string;
  text: string;
  author: string;
  sourceUrl: string;
  attributionNote?: string;
  position: Point;
  depth: number;
  tone: StarTone;
  prominence: StarProminence;
};

export type PathEntry = {
  slug: string;
  organization: string;
  shortLabel: string;
  area: string;
  summary: string;
  position: Point;
  depth: number;
  tone: StarTone;
  prominence: StarProminence;
};

export type SiteContent = {
  site: {
    canonicalUrl: string;
    title: string;
    description: string;
    socialDescription: string;
    language: string;
    locale: string;
    themeColor: string;
  };
  person: {
    name: string;
    alternateName: string;
    role: string;
    location: string;
    headline: string;
    introduction: string;
    links: readonly PublicLink[];
  };
  destinations: readonly {
    slug: DestinationSlug;
    label: string;
    position: Point;
    connections: readonly Connection[];
  }[];
  path: readonly PathEntry[];
  projects: readonly Project[];
  quotes: readonly Quote[];
};

const artifactTypes = new Set<ArtifactType>([
  "ucredit",
  "customization",
  "judge",
  "trace",
  "interface",
]);

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
};

const array = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  return value;
};

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
};

const number = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  return value;
};

const httpsUrl = (value: unknown, path: string): string => {
  const candidate = text(value, path);
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`${path} must be an absolute HTTPS URL`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${path} must be an absolute HTTPS URL`);
  }
  return candidate;
};

const point = (value: unknown, path: string): Point => {
  const coordinates = array(value, path);
  if (
    coordinates.length !== 2 ||
    coordinates.some(
      (coordinate) =>
        typeof coordinate !== "number" ||
        !Number.isFinite(coordinate) ||
        coordinate < 0 ||
        coordinate > 100,
    )
  ) {
    throw new Error(`${path} must contain coordinates from 0 to 100`);
  }
  return coordinates as [number, number];
};

const depth = (value: unknown, path: string): number => {
  const parsed = number(value, path);
  if (parsed < 0.9 || parsed > 1.1) {
    throw new Error(`${path} must be between 0.9 and 1.1`);
  }
  return parsed;
};

const starTone = (value: unknown, path: string): StarTone => {
  const parsed = text(value, path);
  if (
    parsed !== "warm" &&
    parsed !== "neutral" &&
    parsed !== "cool" &&
    parsed !== "violet"
  ) {
    throw new Error(`${path} must be warm, neutral, cool, or violet`);
  }
  return parsed;
};

const starProminence = (value: unknown, path: string): StarProminence => {
  const parsed = number(value, path);
  if (parsed !== 1 && parsed !== 2 && parsed !== 3) {
    throw new Error(`${path} must be 1, 2, or 3`);
  }
  return parsed;
};

const starPlacement = (value: Record<string, unknown>, path: string) => ({
  position: point(value.position, `${path}.position`),
  depth: depth(value.depth, `${path}.depth`),
  tone: starTone(value.tone, `${path}.tone`),
  prominence: starProminence(value.prominence, `${path}.prominence`),
});

const connection = (value: unknown, path: string): Connection => {
  const endpoints = array(value, path);
  if (endpoints.length !== 2) {
    throw new Error(`${path} must connect two item slugs`);
  }
  const from = text(endpoints[0], `${path}[0]`);
  const to = text(endpoints[1], `${path}[1]`);
  if (from === to) {
    throw new Error(`${path} must connect two distinct item slugs`);
  }
  return [from, to];
};

const optionalText = (value: unknown, path: string) =>
  value === undefined ? undefined : text(value, path);

const optionalHttpsUrl = (value: unknown, path: string) =>
  value === undefined ? undefined : httpsUrl(value, path);

const assertUniqueSlugs = (
  values: readonly { slug: string }[],
  kind: string,
) => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.slug)) {
      throw new Error(`Duplicate ${kind} slug "${value.slug}"`);
    }
    seen.add(value.slug);
  }
};

export function validateSiteContent(value: unknown): SiteContent {
  const root = record(value, "content");
  const rawSite = record(root.site, "site");
  const canonicalUrl = httpsUrl(rawSite.canonicalUrl, "site.canonicalUrl");
  const parsedCanonical = new URL(canonicalUrl);
  if (
    parsedCanonical.pathname !== "/" ||
    parsedCanonical.search ||
    parsedCanonical.hash
  ) {
    throw new Error("site.canonicalUrl must point to the origin root");
  }

  const rawPerson = record(root.person, "person");
  const links = array(rawPerson.links, "person.links").map((value, index) => {
    const link = record(value, `person.links[${index}]`);
    return {
      label: text(link.label, `person.links[${index}].label`),
      url: httpsUrl(link.url, `person.links[${index}].url`),
    };
  });

  const destinations = array(root.destinations, "destinations").map(
    (value, index) => {
      const destination = record(value, `destinations[${index}]`);
      const slug = text(
        destination.slug,
        `destinations[${index}].slug`,
      ) as DestinationSlug;
      if (slug !== "path" && slug !== "projects" && slug !== "quotes") {
        throw new Error(`destinations[${index}].slug is not supported`);
      }
      return {
        slug,
        label: text(destination.label, `destinations[${index}].label`),
        position: point(
          destination.position,
          `destinations[${index}].position`,
        ),
        connections: array(
          destination.connections,
          `destinations[${index}].connections`,
        ).map((value, connectionIndex) =>
          connection(
            value,
            `destinations[${index}].connections[${connectionIndex}]`,
          ),
        ),
      };
    },
  );
  if (
    destinations.length !== 3 ||
    destinations.filter(({ slug }) => slug === "path").length !== 1 ||
    destinations.filter(({ slug }) => slug === "projects").length !== 1 ||
    destinations.filter(({ slug }) => slug === "quotes").length !== 1
  ) {
    throw new Error(
      "destinations must contain exactly one path, projects, and quotes destination",
    );
  }

  const path = array(root.path, "path").map((value, index) => {
    const entry = record(value, `path[${index}]`);
    return {
      slug: text(entry.slug, `path[${index}].slug`),
      organization: text(entry.organization, `path[${index}].organization`),
      shortLabel: text(entry.shortLabel, `path[${index}].shortLabel`),
      area: text(entry.area, `path[${index}].area`),
      summary: text(entry.summary, `path[${index}].summary`),
      ...starPlacement(entry, `path[${index}]`),
    };
  });
  assertUniqueSlugs(path, "path entry");

  const projects = array(root.projects, "projects").map((value, index) => {
    const project = record(value, `projects[${index}]`);
    const artifact = text(
      project.artifact,
      `projects[${index}].artifact`,
    ) as ArtifactType;
    if (!artifactTypes.has(artifact)) {
      throw new Error(`projects[${index}].artifact is not supported`);
    }
    return {
      slug: text(project.slug, `projects[${index}].slug`),
      title: text(project.title, `projects[${index}].title`),
      year: number(project.year, `projects[${index}].year`),
      displayYear: text(
        project.displayYear,
        `projects[${index}].displayYear`,
      ),
      question: text(project.question, `projects[${index}].question`),
      description: text(
        project.description,
        `projects[${index}].description`,
      ),
      contribution: text(
        project.contribution,
        `projects[${index}].contribution`,
      ),
      technologies: array(
        project.technologies,
        `projects[${index}].technologies`,
      ).map((technology, technologyIndex) =>
        text(
          technology,
          `projects[${index}].technologies[${technologyIndex}]`,
        ),
      ),
      repositoryUrl: optionalHttpsUrl(
        project.repositoryUrl,
        `projects[${index}].repositoryUrl`,
      ),
      linkLabel: optionalText(
        project.linkLabel,
        `projects[${index}].linkLabel`,
      ),
      artifact,
      ...starPlacement(project, `projects[${index}]`),
    };
  });
  assertUniqueSlugs(projects, "project");

  const quotes = array(root.quotes, "quotes").map((value, index) => {
    const quote = record(value, `quotes[${index}]`);
    return {
      slug: text(quote.slug, `quotes[${index}].slug`),
      text: text(quote.text, `quotes[${index}].text`),
      author: text(quote.author, `quotes[${index}].author`),
      sourceUrl: httpsUrl(quote.sourceUrl, `quotes[${index}].sourceUrl`),
      attributionNote: optionalText(
        quote.attributionNote,
        `quotes[${index}].attributionNote`,
      ),
      ...starPlacement(quote, `quotes[${index}]`),
    };
  });
  assertUniqueSlugs(quotes, "quote");

  const itemsByDestination: Record<
    DestinationSlug,
    readonly { slug: string }[]
  > = { path, projects, quotes };

  destinations.forEach((destination, destinationIndex) => {
    const itemSlugs = new Set(
      itemsByDestination[destination.slug].map(({ slug }) => slug),
    );
    destination.connections.forEach(([from, to], connectionIndex) => {
      if (!itemSlugs.has(from) || !itemSlugs.has(to)) {
        throw new Error(
          `destinations[${destinationIndex}].connections[${connectionIndex}] must reference existing ${destination.slug}`,
        );
      }
    });
  });

  return {
    site: {
      canonicalUrl,
      title: text(rawSite.title, "site.title"),
      description: text(rawSite.description, "site.description"),
      socialDescription: text(
        rawSite.socialDescription,
        "site.socialDescription",
      ),
      language: text(rawSite.language, "site.language"),
      locale: text(rawSite.locale, "site.locale"),
      themeColor: text(rawSite.themeColor, "site.themeColor"),
    },
    person: {
      name: text(rawPerson.name, "person.name"),
      alternateName: text(rawPerson.alternateName, "person.alternateName"),
      role: text(rawPerson.role, "person.role"),
      location: text(rawPerson.location, "person.location"),
      headline: text(rawPerson.headline, "person.headline"),
      introduction: text(rawPerson.introduction, "person.introduction"),
      links,
    },
    destinations,
    path,
    projects,
    quotes,
  };
}

export const siteContent = validateSiteContent(rawSiteContent);

export const projectBySlug = (slug: string) =>
  siteContent.projects.find((project) => project.slug === slug);

export const pathBySlug = (slug: string) =>
  siteContent.path.find((entry) => entry.slug === slug);

export const quoteBySlug = (slug: string) =>
  siteContent.quotes.find((quote) => quote.slug === slug);
