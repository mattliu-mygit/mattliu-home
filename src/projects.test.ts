import { describe, expect, it } from "vitest";

import { projectBySlug, projects } from "./projects";

describe("project catalog", () => {
  it("keeps projects in chronological order with unique slugs", () => {
    expect(projects.map((project) => project.year)).toEqual([
      2020, 2021, 2022, 2026, 2026,
    ]);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(
      projects.length,
    );
  });

  it("finds a project by its public fragment", () => {
    expect(projectBySlug("monopole")?.title).toBe("Monopole");
    expect(projectBySlug("missing")).toBeUndefined();
  });
});
