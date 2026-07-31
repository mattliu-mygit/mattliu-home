import { describe, expect, it } from "vitest";

import { siteContent } from "./content/site-content";
import {
  centeredStoryBeat,
  createStoryBeats,
  storyBeatForLocation,
} from "./story-navigation";

describe("story navigation", () => {
  it("orders intro, projects, project items, quotes, and quote items", () => {
    const beats = createStoryBeats(siteContent);

    expect(beats.map(({ id }) => id)).toEqual([
      "intro",
      "projects",
      ...siteContent.projects.map(({ slug }) => `projects/${slug}`),
      "quotes",
      ...siteContent.quotes.map(({ slug }) => `quotes/${slug}`),
    ]);
  });

  it("maps URL state to the matching drawer beat", () => {
    expect(
      storyBeatForLocation({
        view: "projects",
        projectSlug: "monopole",
      }),
    ).toBe("projects/monopole");
    expect(storyBeatForLocation({ view: "quotes" }, "strong-opinions")).toBe(
      "quotes/strong-opinions",
    );
    expect(storyBeatForLocation({ view: "universe" })).toBe("intro");
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

  it("returns no centered beat for an empty drawer", () => {
    expect(centeredStoryBeat([], 180)).toBeUndefined();
  });
});
