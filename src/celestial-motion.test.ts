import { describe, expect, it } from "vitest";

import {
  advanceCelestialMotion,
  applyWheelImpulse,
  constellationDrift,
  createMeteor,
  createSeededRandom,
  createStarField,
  meteorSegment,
  parallaxDisplacement,
  type CelestialMotion,
} from "./celestial-motion";

const still: CelestialMotion = {
  travel: 0,
  travelVelocity: 0,
};

describe("celestial motion", () => {
  it("keeps constellation drift aligned with decaying sky velocity", () => {
    let motion = applyWheelImpulse(still, 120);
    const first = constellationDrift(motion.travelVelocity);

    expect(first.x).toBeGreaterThan(0);
    expect(first.y).toBeGreaterThan(0);

    for (let frame = 0; frame < 180; frame += 1) {
      motion = advanceCelestialMotion(motion, 16);
      const drift = constellationDrift(motion.travelVelocity);
      expect(Math.sign(drift.x)).toBe(Math.sign(motion.travelVelocity));
      expect(Math.sign(drift.y)).toBe(Math.sign(motion.travelVelocity));
    }

    const settled = constellationDrift(motion.travelVelocity);
    expect(settled.x).toBeGreaterThanOrEqual(0);
    expect(settled.x).toBeLessThan(first.x / 10);
    expect(settled.y).toBeLessThan(first.y / 10);
  });

  it("bounds constellation drift during high-resolution wheel bursts", () => {
    const drift = constellationDrift(20);

    expect(drift.x).toBe(18);
    expect(drift.y).toBeCloseTo(7.56);
  });

  it("moves nearby stars farther than distant stars without a spherical edge", () => {
    const near = parallaxDisplacement(100, 0.45, 0);
    const far = parallaxDisplacement(100, 2.1, 0);

    expect(Math.hypot(near.x, near.y)).toBeGreaterThan(
      Math.hypot(far.x, far.y) * 3,
    );
  });

  it("keeps every meteor trail directly behind its velocity", () => {
    const meteor = {
      x: 40,
      y: -20,
      vx: -520,
      vy: 780,
      born: 1_000,
      life: 0.8,
      trail: 120,
    };
    const segment = meteorSegment(meteor, 1_300);

    expect(segment).not.toBeNull();
    const trail = {
      x: segment!.head.x - segment!.tail.x,
      y: segment!.head.y - segment!.tail.y,
    };
    expect(trail.x * meteor.vy - trail.y * meteor.vx).toBeCloseTo(0, 5);
    expect(trail.x * meteor.vx + trail.y * meteor.vy).toBeGreaterThan(0);
  });

  it("spawns meteors from varied edges and directions", () => {
    const sequence = [
      0.02, 0.2, 0.8, 0.4, 0.3, 0.5,
      0.42, 0.4, 0.1, 0.6, 0.5, 0.2,
      0.88, 0.7, 0.9, 0.5, 0.4, 0.8,
    ];
    let cursor = 0;
    const next = () => sequence[cursor++] ?? 0.5;

    const meteors = [
      createMeteor(next, 1200, 800, 0),
      createMeteor(next, 1200, 800, 0),
      createMeteor(next, 1200, 800, 0),
    ];

    expect(meteors.map((meteor) => meteor.edge)).toEqual([
      "top",
      "left",
      "right",
    ]);
    expect(new Set(meteors.map((meteor) => Math.sign(meteor.vx))).size).toBe(2);
  });

  it("uses all three entry edges in the deterministic runtime schedule", () => {
    const next = createSeededRandom(270731);
    createStarField(310, next);
    const edges = Array.from(
      { length: 9 },
      () => createMeteor(next, 1200, 800, 0).edge,
    );

    expect(new Set(edges)).toEqual(new Set(["top", "left", "right"]));
  });
});
