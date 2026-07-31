import { describe, expect, it } from "vitest";

import {
  canScrollNarrative,
  MAX_NARRATIVE_DELTA_PX,
  normalizeNarrativeWheel,
} from "./wheel-input";

describe("normalizeNarrativeWheel", () => {
  it("keeps ordinary pixel input and clamps unusually large deltas", () => {
    expect(
      normalizeNarrativeWheel({ deltaY: 48, deltaMode: 0 }, 800),
    ).toBe(48);
    expect(
      normalizeNarrativeWheel({ deltaY: 900, deltaMode: 0 }, 800),
    ).toBe(MAX_NARRATIVE_DELTA_PX);
    expect(
      normalizeNarrativeWheel({ deltaY: -900, deltaMode: 0 }, 800),
    ).toBe(-MAX_NARRATIVE_DELTA_PX);
  });

  it("converts line and page wheel units before clamping", () => {
    expect(
      normalizeNarrativeWheel({ deltaY: 2, deltaMode: 1 }, 800),
    ).toBe(32);
    expect(
      normalizeNarrativeWheel({ deltaY: 1, deltaMode: 2 }, 800),
    ).toBe(MAX_NARRATIVE_DELTA_PX);
  });
});

describe("canScrollNarrative", () => {
  const viewport = { clientHeight: 400, scrollHeight: 1_200 };

  it("rejects only outward movement at either boundary", () => {
    expect(canScrollNarrative({ ...viewport, scrollTop: 0 }, -20)).toBe(false);
    expect(canScrollNarrative({ ...viewport, scrollTop: 0 }, 20)).toBe(true);
    expect(canScrollNarrative({ ...viewport, scrollTop: 800 }, 20)).toBe(false);
    expect(canScrollNarrative({ ...viewport, scrollTop: 800 }, -20)).toBe(true);
  });

  it("accepts both directions between boundaries and rejects zero input", () => {
    expect(canScrollNarrative({ ...viewport, scrollTop: 300 }, -20)).toBe(true);
    expect(canScrollNarrative({ ...viewport, scrollTop: 300 }, 20)).toBe(true);
    expect(canScrollNarrative({ ...viewport, scrollTop: 300 }, 0)).toBe(false);
  });
});
