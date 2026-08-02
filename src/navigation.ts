import {
  codaByViewAndSlug,
  pathBySlug,
  projectBySlug,
  quoteBySlug,
} from "./content/site-content";

export type UniverseView = "universe" | "path" | "projects" | "quotes";

export type UniverseLocation =
  | { view: "universe" }
  | { view: "path"; pathSlug?: string }
  | { view: "projects"; projectSlug?: string }
  | { view: "quotes"; quoteSlug?: string };

export function parseUniverseLocation(hash: string): UniverseLocation {
  const fragment = hash.replace(/^#/, "");
  if (!fragment) {
    return { view: "universe" };
  }
  if (fragment === "projects") {
    return { view: "projects" };
  }
  if (fragment === "path") {
    return { view: "path" };
  }
  if (fragment === "quotes") {
    return { view: "quotes" };
  }

  const projectMatch = /^projects\/([a-z0-9-]+)$/.exec(fragment);
  if (
    projectMatch &&
    (projectBySlug(projectMatch[1]) ||
      codaByViewAndSlug("projects", projectMatch[1]))
  ) {
    return {
      view: "projects",
      projectSlug: projectMatch[1],
    };
  }
  const pathMatch = /^path\/([a-z0-9-]+)$/.exec(fragment);
  if (
    pathMatch &&
    (pathBySlug(pathMatch[1]) || codaByViewAndSlug("path", pathMatch[1]))
  ) {
    return { view: "path", pathSlug: pathMatch[1] };
  }
  const quoteMatch = /^quotes\/([a-z0-9-]+)$/.exec(fragment);
  if (
    quoteMatch &&
    (quoteBySlug(quoteMatch[1]) ||
      codaByViewAndSlug("quotes", quoteMatch[1]))
  ) {
    return { view: "quotes", quoteSlug: quoteMatch[1] };
  }
  return { view: "universe" };
}

export function serializeUniverseLocation(
  location: UniverseLocation,
): string {
  if (location.view === "universe") {
    return "";
  }
  if (location.view === "path") {
    return location.pathSlug ? `#path/${location.pathSlug}` : "#path";
  }
  if (location.view === "quotes") {
    return location.quoteSlug
      ? `#quotes/${location.quoteSlug}`
      : "#quotes";
  }
  return location.projectSlug
    ? `#projects/${location.projectSlug}`
    : "#projects";
}
