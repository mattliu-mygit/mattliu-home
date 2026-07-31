import { describe, expect, it } from "vitest";

import { siteContent } from "./content/site-content";
import {
  centeredStoryBeat,
  constellationTravelAtProgress,
  createRouteChapters,
  createRouteMarks,
  createStoryBeats,
  interpolatedStoryProgress,
  routeMarkerPosition,
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
      label: "Origin",
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

  it("positions permanent labels at each story chapter opening and ends on Fin", () => {
    const beats = createStoryBeats(siteContent);
    const chapters = createRouteChapters(beats);
    const markPosition = (index: number) =>
      routeMarkerPosition(index / (beats.length - 1), beats.length);

    expect(chapters.map(({ label }) => label)).toEqual([
      "Intro",
      "Path",
      "Projects",
      "Quotes",
      "Fin",
    ]);
    expect(chapters).toEqual([
      { label: "Intro", position: markPosition(0) },
      { label: "Path", position: markPosition(3) },
      {
        label: "Projects",
        position: markPosition(7),
      },
      {
        label: "Quotes",
        position: markPosition(13),
      },
      { label: "Fin", position: markPosition(20) },
    ]);
  });

  it("derives continuous travel between adjacent stars in one constellation", () => {
    const beats = createStoryBeats(siteContent);
    const denominator = beats.length - 1;
    const before = constellationTravelAtProgress(beats, 4.999 / denominator);
    const after = constellationTravelAtProgress(beats, 5.001 / denominator);

    expect(before).toMatchObject({
      view: "path",
      fromSlug: "johns-hopkins",
      toSlug: "aws-sagemaker",
    });
    expect(before?.progress).toBeCloseTo(0.999);
    expect(after).toMatchObject({
      view: "path",
      fromSlug: "aws-sagemaker",
      toSlug: "wandb-weave",
    });
    expect(after?.progress).toBeCloseTo(0.001);
    expect(constellationTravelAtProgress(beats, 2.5 / denominator)).toBeNull();
    expect(constellationTravelAtProgress(beats, 3.5 / denominator)).toEqual({
      view: "path",
      fromSlug: undefined,
      toSlug: "johns-hopkins",
      progress: 0.5,
    });
    expect(constellationTravelAtProgress(beats, 6.25 / denominator)).toEqual({
      view: "path",
      fromSlug: "wandb-weave",
      toSlug: undefined,
      progress: 0.5,
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

  it("interpolates continuously between surrounding card centers", () => {
    const entries = [
      { id: "first", center: 100 },
      { id: "second", center: 300 },
      { id: "third", center: 500 },
    ];

    expect(interpolatedStoryProgress(entries, 100)).toBe(0);
    expect(interpolatedStoryProgress(entries, 200)).toBe(0.25);
    expect(interpolatedStoryProgress(entries, 500)).toBe(1);
  });

  it("maps exact story positions to the centers of route cells", () => {
    expect(routeMarkerPosition(0, 4)).toBe(12.5);
    expect(routeMarkerPosition(1 / 3, 4)).toBe(37.5);
    expect(routeMarkerPosition(1, 4)).toBe(87.5);
  });
});
