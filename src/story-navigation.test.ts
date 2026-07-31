import { describe, expect, it } from "vitest";

import { siteContent } from "./content/site-content";
import {
  centeredStoryBeat,
  createRouteMarks,
  createStoryBeats,
  storyBeatForLocation,
} from "./story-navigation";

describe("story navigation", () => {
  it("orders intro lines, path, projects, and quotes as one route", () => {
    const beats = createStoryBeats(siteContent);

    expect(beats.map(({ id }) => id)).toEqual([
      "intro/name",
      "intro/headline",
      "intro/context",
      "path",
      ...siteContent.path.map(({ slug }) => `path/${slug}`),
      "projects",
      ...siteContent.projects.map(({ slug }) => `projects/${slug}`),
      "quotes",
      ...siteContent.quotes.map(({ slug }) => `quotes/${slug}`),
    ]);
    expect(beats[0]).toMatchObject({
      kind: "intro",
      content: "Matthew Liu",
      kicker: "Software engineer · Seattle",
    });
    expect(beats[1]).toMatchObject({
      kind: "intro",
      content: siteContent.person.headline,
    });
  });

  it("maps URL state to the matching narrative beat", () => {
    expect(
      storyBeatForLocation({
        view: "projects",
        projectSlug: "monopole",
      }),
    ).toBe("projects/monopole");
    expect(storyBeatForLocation({ view: "quotes" })).toBe("quotes");
    expect(
      storyBeatForLocation({
        view: "quotes",
        quoteSlug: "strong-opinions",
      }),
    ).toBe("quotes/strong-opinions");
    expect(
      storyBeatForLocation({ view: "path", pathSlug: "aws-sagemaker" }),
    ).toBe("path/aws-sagemaker");
    expect(storyBeatForLocation({ view: "universe" })).toBe("intro/name");
  });

  it("derives one labeled route mark per story beat", () => {
    const beats = createStoryBeats(siteContent);
    const marks = createRouteMarks(beats);

    expect(marks).toHaveLength(beats.length);
    expect(marks.find(({ id }) => id === "intro/name")).toMatchObject({
      label: "Universe",
      major: true,
    });
    expect(marks.find(({ id }) => id === "path")).toMatchObject({
      label: "Path",
      major: true,
    });
    expect(marks.find(({ id }) => id === "path/aws-sagemaker")).toMatchObject({
      label: "AWS SageMaker",
      major: false,
    });
  });

  it("chooses the beat nearest the viewport center", () => {
    expect(
      centeredStoryBeat(
        [
          { id: "intro", center: 80 },
          { id: "projects", center: 210 },
        ],
        180,
      ),
    ).toBe("projects");
  });

  it("returns no centered beat for an empty sequence", () => {
    expect(centeredStoryBeat([], 180)).toBeUndefined();
  });
});
