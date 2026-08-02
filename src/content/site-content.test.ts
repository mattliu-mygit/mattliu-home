import { describe, expect, it } from "vitest";

import rawSiteContent from "./site-content.json";
import {
  projectBySlug,
  siteContent,
  validateSiteContent,
} from "./site-content";

const cloneContent = () => structuredClone(rawSiteContent) as Record<
  string,
  unknown
>;

describe("site content", () => {
  it("validates the canonical portfolio content", () => {
    expect(validateSiteContent(cloneContent())).toMatchObject({
      site: {
        canonicalUrl: "https://mattliu-home.vercel.app/",
      },
      person: {
        name: "Matthew Liu",
        headline:
          "I build the systems that keep intelligent software honest.",
        introduction:
          "Working across AI evaluation, observability, and infrastructure, I turn ideas and research into production services built to scale, endure, and evolve.",
      },
    });
    expect(siteContent.destinations.map(({ slug }) => slug)).toEqual([
      "path",
      "projects",
      "quotes",
    ]);
    expect(siteContent.path.map(({ slug }) => slug)).toEqual([
      "johns-hopkins",
      "aws-sagemaker",
      "wandb-weave",
    ]);
    expect(siteContent.path.map(({ brandMarks }) => brandMarks)).toEqual([
      ["/path-logos/johns-hopkins-shield.svg"],
      [
        "/path-logos/aws-cloud.svg",
        "/path-logos/amazon-sagemaker-ai.svg",
      ],
      ["/path-logos/weights-and-biases.svg"],
    ]);
    expect(
      siteContent.codas.map(({ view, slug, text, shortLabel }) => ({
        view,
        slug,
        text,
        shortLabel,
      })),
    ).toEqual([
      {
        view: "path",
        slug: "future",
        text: "Wherever the future holds...",
        shortLabel: "Future",
      },
      {
        view: "projects",
        slug: "builder",
        text: "Builder tinkering...",
        shortLabel: "Builder",
      },
      {
        view: "quotes",
        slug: "inspiration",
        text: "Ever learning and growing, looking more inspiration...",
        shortLabel: "Inspiration",
      },
    ]);
  });

  it("contains the selected projects and quotes in narrative order", () => {
    expect(siteContent.projects.map((project) => project.title)).toEqual([
      "Monopole",
      "Weave Agent Adapter",
      "LLM-as-a-Judge",
      "Model Customization Assistant",
      "UCredit",
    ]);
    expect(siteContent.quotes.map((quote) => quote.slug)).toEqual([
      "less-is-more",
      "failure-to-failure",
      "strong-opinions",
      "simplicity-follows",
    ]);
    expect(siteContent.projects.filter(({ artifact }) => artifact)).toEqual([
      expect.objectContaining({ slug: "llm-as-a-judge", artifact: "judge" }),
    ]);
    expect(
      siteContent.projects
        .filter(({ previewImage }) => previewImage)
        .map(({ slug }) => slug),
    ).toEqual([
      "monopole",
      "weave-agent-adapter",
      "model-customization-assistant",
      "ucredit",
    ]);
    expect(projectBySlug("llm-as-a-judge")?.repositoryUrl).toBeUndefined();
    const perseverance = siteContent.quotes.find(
      (quote) => quote.slug === "failure-to-failure",
    );
    expect(perseverance).toMatchObject({
      author: "Maybe Churchill",
      sourceUrl: "https://quoteinvestigator.com/2014/06/28/success/",
      attributionNote:
        "Origin unknown; commonly misattributed to Winston Churchill.",
    });
  });

  it("gives each constellation a restrained range of individual depth", () => {
    for (const entries of [
      siteContent.path,
      siteContent.projects,
      siteContent.quotes,
      siteContent.codas,
    ]) {
      const depths = entries.map((entry) => entry.depth);
      expect(depths.every((depth) => depth >= 0.9 && depth <= 1.1)).toBe(true);
      expect(new Set(depths).size).toBeGreaterThan(1);
    }
  });

  it("gives every constellation star intentional tone and prominence", () => {
    for (const entries of [
      siteContent.path,
      siteContent.projects,
      siteContent.quotes,
      siteContent.codas,
    ]) {
      expect(
        entries.every((entry) =>
          ["warm", "neutral", "cool", "violet"].includes(entry.tone),
        ),
      ).toBe(true);
      expect(
        entries.every((entry) => [1, 2, 3].includes(entry.prominence)),
      ).toBe(true);
    }
  });

  it("rejects unsupported constellation star intent", () => {
    const invalidTone = cloneContent();
    const toneProjects = invalidTone.projects as Array<Record<string, unknown>>;
    toneProjects[0].tone = "rainbow";

    expect(() => validateSiteContent(invalidTone)).toThrow(
      /projects\[0\]\.tone must be warm, neutral, cool, or violet/i,
    );

    const invalidProminence = cloneContent();
    const prominentProjects = invalidProminence.projects as Array<
      Record<string, unknown>
    >;
    prominentProjects[0].prominence = 4;

    expect(() => validateSiteContent(invalidProminence)).toThrow(
      /projects\[0\]\.prominence must be 1, 2, or 3/i,
    );
  });

  it("rejects Path brand marks that are not local portfolio assets", () => {
    const invalid = cloneContent();
    const path = invalid.path as Array<Record<string, unknown>>;
    path[0].brandMarks = ["https://brand.jhu.edu/shield.svg"];

    expect(() => validateSiteContent(invalid)).toThrow(
      /path\[0\]\.brandMarks\[0\] must be a local Path logo/i,
    );
  });

  it("rejects constellation depth outside the shallow projection range", () => {
    const invalid = cloneContent();
    const projects = invalid.projects as Array<Record<string, unknown>>;
    projects[0].depth = 1.2;

    expect(() => validateSiteContent(invalid)).toThrow(
      /projects\[0\]\.depth must be between 0\.9 and 1\.1/i,
    );
  });

  it("rejects duplicate project and quote slugs", () => {
    const duplicateProject = cloneContent();
    const projects = duplicateProject.projects as Array<Record<string, unknown>>;
    projects.push(structuredClone(projects[0]));

    expect(() => validateSiteContent(duplicateProject)).toThrow(
      /duplicate project slug "monopole"/i,
    );

    const duplicateQuote = cloneContent();
    const quotes = duplicateQuote.quotes as Array<Record<string, unknown>>;
    quotes.push(structuredClone(quotes[0]));

    expect(() => validateSiteContent(duplicateQuote)).toThrow(
      /duplicate quote slug "less-is-more"/i,
    );
  });

  it("rejects a coda that collides with an existing constellation star", () => {
    const invalid = cloneContent();
    const codas = invalid.codas as Array<Record<string, unknown>>;
    codas[0].slug = "wandb-weave";

    expect(() => validateSiteContent(invalid)).toThrow(
      /duplicate path constellation item slug "wandb-weave"/i,
    );
  });

  it("rejects insecure public links", () => {
    const invalid = cloneContent();
    const person = invalid.person as Record<string, unknown>;
    const links = person.links as Array<Record<string, unknown>>;
    links[0].url = "http://github.com/mattliu-mygit";

    expect(() => validateSiteContent(invalid)).toThrow(
      /person\.links\[0\]\.url must be an absolute https url/i,
    );
  });

  it("rejects coordinates outside the constellation", () => {
    const invalid = cloneContent();
    const projects = invalid.projects as Array<Record<string, unknown>>;
    projects[0].position = [-1, 72];

    expect(() => validateSiteContent(invalid)).toThrow(
      /projects\[0\]\.position must contain coordinates from 0 to 100/i,
    );
  });

  it("rejects non-finite constellation coordinates", () => {
    const invalid = cloneContent();
    const projects = invalid.projects as Array<Record<string, unknown>>;
    projects[0].position = [Number.NaN, 72];

    expect(() => validateSiteContent(invalid)).toThrow(
      /projects\[0\]\.position must contain coordinates from 0 to 100/i,
    );
  });

  it("requires exactly one path, projects, and quotes destination", () => {
    const missingQuotes = cloneContent();
    const destinations = missingQuotes.destinations as Array<
      Record<string, unknown>
    >;
    destinations.pop();

    expect(() => validateSiteContent(missingQuotes)).toThrow(
      /destinations must contain exactly one path, projects, and quotes destination/i,
    );

    const duplicateProjects = cloneContent();
    const duplicateDestinations = duplicateProjects.destinations as Array<
      Record<string, unknown>
    >;
    duplicateDestinations[2].slug = "projects";

    expect(() => validateSiteContent(duplicateProjects)).toThrow(
      /destinations must contain exactly one path, projects, and quotes destination/i,
    );
  });

  it("validates shared constellation connection topology", () => {
    expect(
      siteContent.destinations.find(({ slug }) => slug === "path")
        ?.connections,
    ).toEqual([
      ["johns-hopkins", "aws-sagemaker"],
      ["aws-sagemaker", "wandb-weave"],
      ["wandb-weave", "future"],
    ]);
    expect(
      siteContent.destinations.find(({ slug }) => slug === "projects")
        ?.connections,
    ).toEqual([
      ["monopole", "weave-agent-adapter"],
      ["weave-agent-adapter", "llm-as-a-judge"],
      ["llm-as-a-judge", "model-customization-assistant"],
      ["model-customization-assistant", "ucredit"],
      ["ucredit", "builder"],
    ]);
    expect(
      siteContent.destinations.find(({ slug }) => slug === "quotes")
        ?.connections,
    ).toEqual([
      ["less-is-more", "failure-to-failure"],
      ["failure-to-failure", "strong-opinions"],
      ["strong-opinions", "simplicity-follows"],
      ["simplicity-follows", "inspiration"],
    ]);

    const invalid = cloneContent();
    const destinations = invalid.destinations as Array<
      Record<string, unknown>
    >;
    destinations[0].connections = [["johns-hopkins", "missing-stop"]];

    expect(() => validateSiteContent(invalid)).toThrow(
      /destinations\[0\]\.connections\[0\].*existing path/i,
    );
  });

  it("rejects unknown artifact types", () => {
    const invalid = cloneContent();
    const projects = invalid.projects as Array<Record<string, unknown>>;
    projects[0].artifact = "invented";

    expect(() => validateSiteContent(invalid)).toThrow(
      /projects\[0\]\.artifact is not supported/i,
    );
  });

  it("requires exactly one project preview mode", () => {
    const neither = cloneContent();
    const projectsWithoutPreview = neither.projects as Array<
      Record<string, unknown>
    >;
    delete projectsWithoutPreview[2].artifact;

    expect(() => validateSiteContent(neither)).toThrow(
      /projects\[2\] must define exactly one of artifact or previewImage/i,
    );

    const both = cloneContent();
    const projectsWithBoth = both.projects as Array<Record<string, unknown>>;
    projectsWithBoth[2].previewImage = "/project-previews/judge.png";
    projectsWithBoth[2].previewAlt = "Judge preview";
    projectsWithBoth[2].previewSourceUrl = "https://example.com/judge";

    expect(() => validateSiteContent(both)).toThrow(
      /projects\[2\] must define exactly one of artifact or previewImage/i,
    );
  });

  it("requires the canonical URL to point at the site root", () => {
    const invalid = cloneContent();
    const site = invalid.site as Record<string, unknown>;
    site.canonicalUrl = "https://mattliu-home.vercel.app/about";

    expect(() => validateSiteContent(invalid)).toThrow(
      /site\.canonicalUrl must point to the origin root/i,
    );
  });
});
