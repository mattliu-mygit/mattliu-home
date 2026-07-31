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
      },
    });
  });

  it("contains the selected projects and quotes in narrative order", () => {
    expect(siteContent.projects.map((project) => project.title)).toEqual([
      "UCredit",
      "Model Customization Assistant",
      "LLM-as-a-Judge",
      "Weave Agent Adapter",
      "Monopole",
    ]);
    expect(siteContent.quotes).toHaveLength(7);
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

  it("rejects duplicate project and quote slugs", () => {
    const duplicateProject = cloneContent();
    const projects = duplicateProject.projects as Array<Record<string, unknown>>;
    projects.push(structuredClone(projects[0]));

    expect(() => validateSiteContent(duplicateProject)).toThrow(
      /duplicate project slug "ucredit"/i,
    );

    const duplicateQuote = cloneContent();
    const quotes = duplicateQuote.quotes as Array<Record<string, unknown>>;
    quotes.push(structuredClone(quotes[0]));

    expect(() => validateSiteContent(duplicateQuote)).toThrow(
      /duplicate quote slug "less-is-more"/i,
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

  it("requires exactly one projects and one quotes destination", () => {
    const missingQuotes = cloneContent();
    const destinations = missingQuotes.destinations as Array<
      Record<string, unknown>
    >;
    destinations.pop();

    expect(() => validateSiteContent(missingQuotes)).toThrow(
      /destinations must contain exactly one projects and one quotes destination/i,
    );

    const duplicateProjects = cloneContent();
    const duplicateDestinations = duplicateProjects.destinations as Array<
      Record<string, unknown>
    >;
    duplicateDestinations[1].slug = "projects";

    expect(() => validateSiteContent(duplicateProjects)).toThrow(
      /destinations must contain exactly one projects and one quotes destination/i,
    );
  });

  it("validates shared constellation connection topology", () => {
    expect(siteContent.destinations[0].connections).toEqual([
      ["ucredit", "model-customization-assistant"],
      ["model-customization-assistant", "llm-as-a-judge"],
      ["llm-as-a-judge", "weave-agent-adapter"],
      ["weave-agent-adapter", "monopole"],
    ]);

    const invalid = cloneContent();
    const destinations = invalid.destinations as Array<
      Record<string, unknown>
    >;
    destinations[0].connections = [["ucredit", "missing-project"]];

    expect(() => validateSiteContent(invalid)).toThrow(
      /destinations\[0\]\.connections\[0\].*existing projects/i,
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

  it("requires the canonical URL to point at the site root", () => {
    const invalid = cloneContent();
    const site = invalid.site as Record<string, unknown>;
    site.canonicalUrl = "https://mattliu-home.vercel.app/about";

    expect(() => validateSiteContent(invalid)).toThrow(
      /site\.canonicalUrl must point to the origin root/i,
    );
  });
});
