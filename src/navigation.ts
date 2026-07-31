import { projectBySlug } from "./content/site-content";

export type UniverseView = "universe" | "projects" | "quotes";

export type UniverseLocation =
  | { view: "universe" }
  | { view: "projects"; projectSlug?: string }
  | { view: "quotes" };

export function parseUniverseLocation(hash: string): UniverseLocation {
  const fragment = hash.replace(/^#/, "");
  if (!fragment) {
    return { view: "universe" };
  }
  if (fragment === "projects") {
    return { view: "projects" };
  }
  if (fragment === "quotes") {
    return { view: "quotes" };
  }

  const projectMatch = /^projects\/([a-z0-9-]+)$/.exec(fragment);
  if (projectMatch && projectBySlug(projectMatch[1])) {
    return {
      view: "projects",
      projectSlug: projectMatch[1],
    };
  }
  return { view: "universe" };
}

export function serializeUniverseLocation(
  location: UniverseLocation,
): string {
  if (location.view === "universe") {
    return "";
  }
  if (location.view === "quotes") {
    return "#quotes";
  }
  return location.projectSlug
    ? `#projects/${location.projectSlug}`
    : "#projects";
}
