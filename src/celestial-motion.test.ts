import { describe, expect, it } from "vitest";

import {
  advanceCelestialMotion,
  applyWheelImpulse,
  constellationFocusOffset,
  constellationFocusPoint,
  constellationDrift,
  createMeteor,
  createSeededRandom,
  createStarField,
  dampPoint,
  directionalConstellationDrift,
  meteorSegment,
  parallaxDisplacement,
  projectConstellationPoint,
  worldCameraFor,
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

  it("derives stable universe and focused world-camera targets", () => {
    expect(worldCameraFor("universe", { x: 61, y: 25 })).toEqual({
      origin: { x: 50, y: 50 },
      scale: 1,
      focused: false,
    });
    expect(worldCameraFor("path", { x: 61, y: 25 })).toEqual({
      origin: { x: 61, y: 25 },
      scale: 3.4,
      focused: true,
    });
  });

  it("pulls a focused constellation toward the next selected star", () => {
    const drift = directionalConstellationDrift(1, { x: -14, y: 24 });

    expect(drift.x).toBeLessThan(0);
    expect(drift.y).toBeGreaterThan(0);
    expect(Math.hypot(drift.x, drift.y)).toBeCloseTo(10);
    expect(directionalConstellationDrift(0, { x: -14, y: 24 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("damps a constellation pull through a direction reversal", () => {
    const current = { x: 10, y: 0 };
    const target = { x: -8, y: 6 };
    const first = dampPoint(current, target, 16);

    expect(first.x).toBeGreaterThan(target.x);
    expect(first.x).toBeLessThan(current.x);
    expect(first.y).toBeGreaterThan(0);

    let settled = first;
    for (let frame = 0; frame < 120; frame += 1) {
      settled = dampPoint(settled, target, 16);
    }
    expect(settled.x).toBeCloseTo(target.x, 3);
    expect(settled.y).toBeCloseTo(target.y, 3);

    const twoFrames = dampPoint(dampPoint(current, target, 16), target, 16);
    const oneFrame = dampPoint(current, target, 32);
    expect(oneFrame.x).toBeCloseTo(twoFrames.x, 10);
    expect(oneFrame.y).toBeCloseTo(twoFrames.y, 10);
  });

  it("projects shallow star depth without changing the base constellation", () => {
    const base = [50, 50] as const;
    const near = projectConstellationPoint(
      base,
      0.9,
      { x: 10, y: 6 },
      { width: 1000, height: 600 },
    );
    const far = projectConstellationPoint(
      base,
      1.1,
      { x: 10, y: 6 },
      { width: 1000, height: 600 },
    );

    expect(near[0] - base[0]).toBeGreaterThan(far[0] - base[0]);
    expect(near[1] - base[1]).toBeGreaterThan(far[1] - base[1]);
    expect(
      projectConstellationPoint(
        base,
        0.9,
        { x: 0, y: 0 },
        { width: 1000, height: 600 },
      ),
    ).toEqual(base);
  });

  it("moves nearby stars farther than distant stars without a spherical edge", () => {
    const near = parallaxDisplacement(100, 0.45, 0);
    const far = parallaxDisplacement(100, 2.1, 0);

    expect(Math.hypot(near.x, near.y)).toBeGreaterThan(
      Math.hypot(far.x, far.y) * 3,
    );
  });

  it("interpolates focus continuously and bounds distant star travel", () => {
    const before = constellationFocusPoint(
      { x: 12, y: 72 },
      { x: 48, y: 28 },
      0.999,
    );
    const after = constellationFocusPoint(
      { x: 48, y: 28 },
      { x: 88, y: 58 },
      0.001,
    );

    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(
      0.2,
    );
    expect(constellationFocusOffset({ x: 100, y: 100 })).toEqual({
      x: -4,
      y: -3,
    });
    expect(constellationFocusOffset({ x: 50, y: 50 })).toEqual({ x: 0, y: 0 });
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

  it("builds a restrained field of faint, medium, and anchor stars", () => {
    const stars = createStarField(500, createSeededRandom(270731));

    expect(stars.filter(({ tier }) => tier === "anchor")).toHaveLength(20);
    expect(stars.filter(({ tier }) => tier === "medium")).toHaveLength(80);
    expect(stars.filter(({ tier }) => tier === "faint")).toHaveLength(400);
    expect(new Set(stars.map(({ temperature }) => temperature))).toEqual(
      new Set(["warm", "neutral", "cool"]),
    );
    expect(
      stars.every(({ twinkle }) => twinkle >= 0.02 && twinkle <= 0.12),
    ).toBe(true);

    const anchors = stars.filter(({ tier }) => tier === "anchor");
    const medium = stars.filter(({ tier }) => tier === "medium");
    const faint = stars.filter(({ tier }) => tier === "faint");
    expect(Math.min(...faint.map(({ size }) => size))).toBeGreaterThanOrEqual(
      0.264,
    );
    expect(Math.min(...medium.map(({ size }) => size))).toBeGreaterThanOrEqual(
      0.616,
    );
    expect(Math.min(...anchors.map(({ size }) => size))).toBeGreaterThanOrEqual(
      1.045,
    );
    expect(Math.max(...faint.map(({ size }) => size))).toBeGreaterThanOrEqual(
      0.57,
    );
    expect(Math.max(...medium.map(({ size }) => size))).toBeGreaterThanOrEqual(
      0.92,
    );
    expect(Math.max(...anchors.map(({ size }) => size))).toBeGreaterThanOrEqual(
      1.5,
    );
    expect(Math.min(...anchors.map(({ size }) => size))).toBeGreaterThan(
      Math.max(...faint.map(({ size }) => size)),
    );
  });

  it("repeats the same visual star profiles for the same seed", () => {
    const first = createStarField(40, createSeededRandom(17));
    const second = createStarField(40, createSeededRandom(17));

    expect(second).toEqual(first);
    expect(first.some(({ double }) => double)).toBe(true);
  });
});
