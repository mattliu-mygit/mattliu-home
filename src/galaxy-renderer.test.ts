import { describe, expect, it } from "vitest";
import { AdditiveBlending, DoubleSide } from "three";

import {
  GALAXY_HAZE_BLENDING,
  GALAXY_HAZE_LAYERS,
  GALAXY_HAZE_SIDE,
  GALAXY_CORE_RADIUS,
} from "./galaxy-renderer";

describe("galaxy core", () => {
  it("keeps the lingering region tightly scoped to the bright center", () => {
    expect(GALAXY_CORE_RADIUS).toBeGreaterThan(0.25);
    expect(GALAXY_CORE_RADIUS).toBeLessThan(0.6);
  });
});

describe("galaxy haze layers", () => {
  it("surrounds the stellar disk with shallow, independently textured haze", () => {
    expect(GALAXY_HAZE_SIDE).toBe(DoubleSide);
    expect(GALAXY_HAZE_BLENDING).toBe(AdditiveBlending);
    expect(GALAXY_HAZE_LAYERS).toHaveLength(3);
    expect(new Set(GALAXY_HAZE_LAYERS.map(({ seed }) => seed)).size).toBe(3);
    expect(Math.min(...GALAXY_HAZE_LAYERS.map(({ offset }) => offset))).toBeLessThan(-0.2);
    expect(Math.max(...GALAXY_HAZE_LAYERS.map(({ offset }) => offset))).toBeGreaterThan(0.2);
    expect(Math.max(...GALAXY_HAZE_LAYERS.map(({ offset }) => Math.abs(offset)))).toBeLessThan(0.4);
    const totalOpacity = GALAXY_HAZE_LAYERS.reduce(
      (sum, { opacity }) => sum + opacity,
      0,
    );
    expect(totalOpacity).toBeGreaterThan(0.3);
    expect(totalOpacity).toBeLessThan(0.45);
  });
});
