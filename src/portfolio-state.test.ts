import { describe, expect, it } from "vitest";

import { siteContent } from "./content/site-content";
import {
  createPortfolioState,
  portfolioReducer,
} from "./portfolio-state";
import { createStoryBeats, type StoryBeat } from "./story-navigation";

const storyBeats = createStoryBeats(siteContent);
const projectBeat = storyBeats.find(
  (beat): beat is Extract<StoryBeat, { kind: "project" }> =>
    beat.kind === "project" && beat.itemSlug === "monopole",
);
const builderBeat = storyBeats.find(
  (beat): beat is Extract<StoryBeat, { kind: "coda" }> =>
    beat.kind === "coda" && beat.itemSlug === "builder",
);

if (!projectBeat || !builderBeat) {
  throw new Error("Expected project and coda story beats");
}

describe("portfolio state", () => {
  it("initializes persistent selections and the story beat from the URL location", () => {
    expect(
      createPortfolioState({ view: "quotes", quoteSlug: "strong-opinions" }),
    ).toEqual({
      location: { view: "quotes", quoteSlug: "strong-opinions" },
      activeStoryId: "quotes/strong-opinions",
      selections: {
        path: siteContent.path[0].slug,
        projects: undefined,
        quotes: "strong-opinions",
      },
    });
  });

  it("synchronizes a URL location without clearing other persistent selections", () => {
    const state = portfolioReducer(
      createPortfolioState({ view: "universe" }),
      {
        type: "select-item",
        view: "quotes",
        itemSlug: "strong-opinions",
      },
    );

    expect(
      portfolioReducer(state, {
        type: "sync-location",
        location: { view: "path", pathSlug: "aws-sagemaker" },
      }),
    ).toEqual({
      location: { view: "path", pathSlug: "aws-sagemaker" },
      activeStoryId: "path/aws-sagemaker",
      selections: {
        path: "aws-sagemaker",
        projects: undefined,
        quotes: "strong-opinions",
      },
    });
  });

  it("returns to the universe while preserving constellation selections", () => {
    const state = portfolioReducer(
      createPortfolioState({ view: "universe" }),
      {
        type: "enter-constellation",
        view: "path",
        itemSlug: "aws-sagemaker",
      },
    );

    expect(
      portfolioReducer(state, { type: "return-to-universe" }),
    ).toMatchObject({
      location: { view: "universe" },
      activeStoryId: "intro/name",
      selections: { path: "aws-sagemaker" },
    });
  });

  it("enters a constellation with its requested persistent selection", () => {
    const initial = createPortfolioState({ view: "universe" });

    expect(
      portfolioReducer(initial, {
        type: "enter-constellation",
        view: "path",
        itemSlug: "aws-sagemaker",
      }),
    ).toMatchObject({
      location: { view: "path", pathSlug: "aws-sagemaker" },
      activeStoryId: "path/aws-sagemaker",
      selections: { path: "aws-sagemaker" },
    });
  });

  it("passively focuses a project beat without opening its URL hierarchy", () => {
    const initial = createPortfolioState({ view: "universe" });

    expect(
      portfolioReducer(initial, { type: "focus-beat", beat: projectBeat }),
    ).toMatchObject({
      location: { view: "projects" },
      activeStoryId: projectBeat.id,
      selections: { projects: projectBeat.itemSlug },
    });
  });

  it("focuses a coda as a selected constellation endpoint", () => {
    const initial = createPortfolioState({ view: "universe" });

    expect(
      portfolioReducer(initial, { type: "focus-beat", beat: builderBeat }),
    ).toMatchObject({
      location: { view: "projects", projectSlug: "builder" },
      activeStoryId: "projects/builder",
      selections: { projects: "builder" },
    });
  });

  it("opens a project selection through the project URL hierarchy", () => {
    const initial = createPortfolioState({ view: "projects" });

    expect(
      portfolioReducer(initial, {
        type: "select-item",
        view: "projects",
        itemSlug: "monopole",
      }),
    ).toMatchObject({
      location: { view: "projects", projectSlug: "monopole" },
      activeStoryId: "projects/monopole",
      selections: { projects: "monopole" },
    });
  });

  it("closes a project lens without changing its active project beat", () => {
    const openedProject = portfolioReducer(
      createPortfolioState({ view: "projects" }),
      {
        type: "select-item",
        view: "projects",
        itemSlug: "monopole",
      },
    );

    expect(
      portfolioReducer(openedProject, { type: "close-project" }),
    ).toEqual({
      location: { view: "projects" },
      activeStoryId: "projects/monopole",
      selections: openedProject.selections,
    });
  });
});
