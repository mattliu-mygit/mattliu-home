import { describe, expect, it } from "vitest";

import {
  parseUniverseLocation,
  serializeUniverseLocation,
} from "./navigation";

describe("universe location", () => {
  it.each([
    ["", { view: "universe" }],
    ["#", { view: "universe" }],
    ["#projects", { view: "projects" }],
    ["#path", { view: "path" }],
    ["#quotes", { view: "quotes" }],
    [
      "#path/aws-sagemaker",
      { view: "path", pathSlug: "aws-sagemaker" },
    ],
    [
      "#projects/llm-as-a-judge",
      { view: "projects", projectSlug: "llm-as-a-judge" },
    ],
    [
      "#quotes/less-is-more",
      { view: "quotes", quoteSlug: "less-is-more" },
    ],
  ] as const)("parses %s", (hash, expected) => {
    expect(parseUniverseLocation(hash)).toEqual(expected);
  });

  it.each([
    "#unknown",
    "#projects/not-a-project",
    "#path/not-a-stop",
    "#quotes/not-a-quote",
    "#projects/",
  ])("returns malformed fragment %s to the universe", (hash) => {
    expect(parseUniverseLocation(hash)).toEqual({ view: "universe" });
  });

  it("serializes only the approved fragment hierarchy", () => {
    expect(serializeUniverseLocation({ view: "universe" })).toBe("");
    expect(serializeUniverseLocation({ view: "path" })).toBe("#path");
    expect(serializeUniverseLocation({ view: "projects" })).toBe("#projects");
    expect(serializeUniverseLocation({ view: "quotes" })).toBe("#quotes");
    expect(
      serializeUniverseLocation({
        view: "path",
        pathSlug: "wandb-weave",
      }),
    ).toBe("#path/wandb-weave");
    expect(
      serializeUniverseLocation({
        view: "projects",
        projectSlug: "ucredit",
      }),
    ).toBe("#projects/ucredit");
    expect(
      serializeUniverseLocation({
        view: "quotes",
        quoteSlug: "strong-opinions",
      }),
    ).toBe("#quotes/strong-opinions");
  });
});
