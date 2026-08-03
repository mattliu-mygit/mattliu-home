import { describe, expect, it } from "vitest";

import {
  createGalaxyField,
  galaxyPointCountFor,
} from "./field";

describe("galaxy field", () => {
  it("creates deterministic packed attributes for one seeded disk", () => {
    const first = createGalaxyField({ count: 2_000, seed: 731 });
    const second = createGalaxyField({ count: 2_000, seed: 731 });

    expect(first.positions).toEqual(second.positions);
    expect(first.colors).toEqual(second.colors);
    expect(first.sizes).toEqual(second.sizes);
    expect(first.alphas).toEqual(second.alphas);
    expect(first.positions).toHaveLength(6_000);
    expect(first.colors).toHaveLength(6_000);
    expect(first.sizes).toHaveLength(2_000);
    expect(first.alphas).toHaveLength(2_000);
  });

  it("forms a wide disk with a thin bright plane and a faint thick layer", () => {
    const field = createGalaxyField({ count: 12_000, seed: 80317 });
    const radii: number[] = [];
    const heights: number[] = [];

    for (let index = 0; index < field.sizes.length; index += 1) {
      const x = field.positions[index * 3];
      const y = field.positions[index * 3 + 1];
      const z = field.positions[index * 3 + 2];
      radii.push(Math.hypot(x, z));
      heights.push(Math.abs(y));
    }

    expect(Math.max(...radii)).toBeGreaterThan(11.5);
    expect(Math.max(...radii)).toBeLessThanOrEqual(13);
    expect(Math.max(...heights)).toBeLessThan(2.6);
    expect(heights.filter((height) => height < 0.34).length).toBeGreaterThan(
      field.sizes.length * 0.72,
    );
    expect(heights.filter((height) => height > 0.75).length).toBeGreaterThan(
      field.sizes.length * 0.015,
    );
  });

  it("concentrates the densest visible star population through the center", () => {
    const field = createGalaxyField({ count: 16_000, seed: 4921 });
    let central = 0;
    let outer = 0;

    for (let index = 0; index < field.sizes.length; index += 1) {
      const x = field.positions[index * 3];
      const z = field.positions[index * 3 + 2];
      const radius = Math.hypot(x, z);
      central += Number(radius < 3.25);
      outer += Number(radius > 7);
    }

    expect(central / field.sizes.length).toBeGreaterThan(0.56);
    expect(central).toBeGreaterThan(outer * 4);
  });

  it("keeps the unresolved center below the brightness of individual disk stars", () => {
    const field = createGalaxyField({ count: 26_000, seed: 80317 });
    const centralAlphas: number[] = [];
    const centralSizes: number[] = [];
    const diskAlphas: number[] = [];

    for (let index = 0; index < field.sizes.length; index += 1) {
      const x = field.positions[index * 3];
      const z = field.positions[index * 3 + 2];
      const radius = Math.hypot(x, z);
      if (radius < 1.5) {
        centralAlphas.push(field.alphas[index]);
        centralSizes.push(field.sizes[index]);
      } else if (radius > 4 && radius < 7) {
        diskAlphas.push(field.alphas[index]);
      }
    }

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(average(centralAlphas)).toBeLessThan(average(diskAlphas) * 0.35);
    expect(Math.max(...centralSizes)).toBeLessThanOrEqual(1.101);
  });

  it("clusters more unresolved stars through the inner core", () => {
    const field = createGalaxyField({ count: 26_000, seed: 80317 });
    let innermost = 0;
    let inner = 0;

    for (let index = 0; index < field.sizes.length; index += 1) {
      const radius = Math.hypot(
        field.positions[index * 3],
        field.positions[index * 3 + 2],
      );
      innermost += Number(radius < 1.5);
      inner += Number(radius < 2.5);
    }

    expect(innermost / field.sizes.length).toBeGreaterThan(0.36);
    expect(inner / field.sizes.length).toBeGreaterThan(0.52);
  });

  it("cuts irregular low-light lanes through the visible disk plane", () => {
    const field = createGalaxyField({ count: 26_000, seed: 80317 });
    let visiblePlane = 0;
    let dustDimmed = 0;

    for (let index = 0; index < field.sizes.length; index += 1) {
      const x = field.positions[index * 3];
      const y = Math.abs(field.positions[index * 3 + 1]);
      const z = field.positions[index * 3 + 2];
      const radius = Math.hypot(x, z);
      if (y < 0.55 && radius > 2 && radius < 10) {
        visiblePlane += 1;
        dustDimmed += Number(field.alphas[index] < 0.18);
      }
    }

    expect(dustDimmed / visiblePlane).toBeGreaterThan(0.1);
  });

  it("keeps the central bulge warmer and the disk predominantly cool", () => {
    const field = createGalaxyField({ count: 10_000, seed: 1193 });
    let centralWarm = 0;
    let centralCount = 0;
    let coolDisk = 0;
    let diskCount = 0;

    for (let index = 0; index < field.sizes.length; index += 1) {
      const x = field.positions[index * 3];
      const z = field.positions[index * 3 + 2];
      const red = field.colors[index * 3];
      const blue = field.colors[index * 3 + 2];
      const radius = Math.hypot(x, z);
      if (radius < 2.2) {
        centralCount += 1;
        centralWarm += Number(red > blue);
      } else if (radius > 4) {
        diskCount += 1;
        coolDisk += Number(blue >= red);
      }
    }

    expect(centralWarm / centralCount).toBeGreaterThan(0.62);
    expect(coolDisk / diskCount).toBeGreaterThan(0.62);
    expect(Math.min(...field.alphas)).toBeGreaterThanOrEqual(0.079);
    expect(Math.max(...field.alphas)).toBeLessThanOrEqual(1);
  });

  it("uses a smaller but still dense field on narrow displays", () => {
    expect(galaxyPointCountFor(390)).toBe(11_000);
    expect(galaxyPointCountFor(1_440)).toBe(26_000);
  });
});
