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
    ["#quotes", { view: "quotes" }],
    [
      "#projects/llm-as-a-judge",
      { view: "projects", projectSlug: "llm-as-a-judge" },
    ],
  ] as const)("parses %s", (hash, expected) => {
    expect(parseUniverseLocation(hash)).toEqual(expected);
  });

  it.each([
    "#unknown",
    "#projects/not-a-project",
    "#quotes/less-is-more",
    "#projects/",
  ])("returns malformed fragment %s to the universe", (hash) => {
    expect(parseUniverseLocation(hash)).toEqual({ view: "universe" });
  });

  it("serializes only the approved fragment hierarchy", () => {
    expect(serializeUniverseLocation({ view: "universe" })).toBe("");
    expect(serializeUniverseLocation({ view: "projects" })).toBe("#projects");
    expect(serializeUniverseLocation({ view: "quotes" })).toBe("#quotes");
    expect(
      serializeUniverseLocation({
        view: "projects",
        projectSlug: "ucredit",
      }),
    ).toBe("#projects/ucredit");
  });
});
