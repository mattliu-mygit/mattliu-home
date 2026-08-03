import { describe, expect, it } from "vitest";

import { createGalaxyTexture } from "./texture";

const alphaAt = (
  data: Uint8Array,
  width: number,
  x: number,
  y: number,
) => data[(y * width + x) * 4 + 3];

describe("galaxy unresolved-light texture", () => {
  it("generates deterministic packed RGBA light and dust", () => {
    const first = createGalaxyTexture({ height: 64, seed: 2718, width: 256 });
    const second = createGalaxyTexture({ height: 64, seed: 2718, width: 256 });

    expect(first).toEqual(second);
    expect(first).toHaveLength(256 * 64 * 4);
  });

  it("keeps the center granular and denser than the tapered edges", () => {
    const width = 256;
    const height = 64;
    const texture = createGalaxyTexture({ height, seed: 1618, width });
    const central: number[] = [];
    const edge: number[] = [];

    for (let y = 18; y < 46; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = alphaAt(texture, width, x, y);
        if (x >= 96 && x < 160) {
          central.push(alpha);
        } else if (x < 48 || x >= 208) {
          edge.push(alpha);
        }
      }
    }

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    const centralAverage = average(central);

    expect(centralAverage).toBeGreaterThan(90);
    expect(centralAverage).toBeGreaterThan(average(edge) * 1.75);
    expect(
      central.filter((alpha) => alpha < centralAverage * 0.48).length,
    ).toBeGreaterThan(central.length * 0.03);
    expect(
      central.filter((alpha) => alpha > centralAverage * 1.35).length,
    ).toBeGreaterThan(central.length * 0.08);
  });

  it("uses restrained neutral color with a subtly warmer center", () => {
    const width = 192;
    const height = 48;
    const texture = createGalaxyTexture({ height, seed: 5772, width });
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const centerIndex = (centerY * width + centerX) * 4;
    const outerIndex = (centerY * width + 20) * 4;

    expect(texture[centerIndex]).toBeGreaterThan(texture[centerIndex + 2]);
    expect(texture[outerIndex + 2]).toBeGreaterThanOrEqual(
      texture[outerIndex],
    );
    expect(texture[centerIndex] - texture[centerIndex + 2]).toBeLessThan(45);
  });

  it("keeps coherent unresolved light visible without lifting the dark-sky floor", () => {
    const width = 256;
    const height = 256;
    const texture = createGalaxyTexture({ height, seed: 1618, width });
    const alphaValues: number[] = [];
    const isHaze = (x: number, y: number) => {
      const index = (y * width + x) * 4;
      return (
        texture[index + 3] > 70 &&
        Math.abs(texture[index] - texture[index + 2]) < 90
      );
    };
    let hazePixels = 0;
    let coherentPixels = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        alphaValues.push(texture[index + 3]);
        if (!isHaze(x, y)) continue;
        hazePixels += 1;
        if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) continue;

        let nearbyColoredPixels = 0;
        for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
          for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
            if (
              (offsetX !== 0 || offsetY !== 0) &&
              isHaze(x + offsetX, y + offsetY)
            ) {
              nearbyColoredPixels += 1;
            }
          }
        }
        if (nearbyColoredPixels >= 5) coherentPixels += 1;
      }
    }

    alphaValues.sort((left, right) => left - right);
    expect(hazePixels).toBeGreaterThan(3_500);
    expect(hazePixels).toBeLessThan(28_000);
    expect(coherentPixels).toBeGreaterThan(5_000);
    expect(alphaValues[Math.floor(alphaValues.length / 2)]).toBeLessThanOrEqual(
      22,
    );
  });

  it("mixes unresolved central light with visible dust absorption", () => {
    const width = 256;
    const height = 256;
    const texture = createGalaxyTexture({ height, seed: 1618, width });
    let darkDustPixels = 0;
    let softHazePixels = 0;
    let clippedPixels = 0;

    for (let y = 80; y < 176; y += 1) {
      for (let x = 80; x < 176; x += 1) {
        const index = (y * width + x) * 4;
        const red = texture[index];
        const green = texture[index + 1];
        const blue = texture[index + 2];
        const alpha = texture[index + 3];
        darkDustPixels += Number(red < 52 && green < 55 && blue < 68 && alpha > 20);
        softHazePixels += Number(red > 110 && blue > 120 && alpha > 32 && alpha < 185);
        clippedPixels += Number(alpha > 224);
      }
    }

    expect(darkDustPixels).toBeGreaterThan(600);
    expect(softHazePixels).toBeGreaterThan(2_000);
    expect(clippedPixels).toBeLessThan(40);
  });

  it("distributes stronger haze across several coherent patches", () => {
    const width = 256;
    const texture = createGalaxyTexture({ height: 256, seed: 1618, width });
    let strongHazePixels = 0;
    let strongHazeLuminance = 0;
    const occupiedRegions = new Set<string>();

    for (let index = 0; index < width * width; index += 1) {
      const offset = index * 4;
      const isLight =
        texture[offset] > 110 &&
        texture[offset + 2] > 120 &&
        texture[offset + 3] > 100;
      strongHazePixels += Number(isLight);
      if (isLight) {
        const x = index % width;
        const y = Math.floor(index / width);
        occupiedRegions.add(`${Math.floor(x / 32)}:${Math.floor(y / 32)}`);
        strongHazeLuminance +=
          (texture[offset] + texture[offset + 1] + texture[offset + 2]) / 3;
      }
    }

    expect(strongHazePixels).toBeGreaterThan(3_500);
    expect(strongHazePixels).toBeLessThan(10_000);
    expect(occupiedRegions.size).toBeGreaterThanOrEqual(12);
    expect(strongHazeLuminance / strongHazePixels).toBeGreaterThan(190);
  });

  it("concentrates irregular colored cloud patches toward the galactic core", () => {
    const width = 256;
    const texture = createGalaxyTexture({ height: 256, seed: 1618, width });
    let centralPixels = 0;
    let centralStrongHaze = 0;
    let outerPixels = 0;
    let outerStrongHaze = 0;
    let warmHaze = 0;
    let coolHaze = 0;

    for (let y = 0; y < width; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const normalizedX = (x + 0.5) / width * 2 - 1;
        const normalizedY = (y + 0.5) / width * 2 - 1;
        const radius = Math.hypot(normalizedX, normalizedY);
        const index = (y * width + x) * 4;
        const alpha = texture[index + 3];
        const isStrongHaze = alpha > 100;

        if (radius < 0.42) {
          centralPixels += 1;
          centralStrongHaze += Number(isStrongHaze);
        } else if (radius > 0.56 && radius < 0.9) {
          outerPixels += 1;
          outerStrongHaze += Number(isStrongHaze);
        }

        if (isStrongHaze && texture[index] - texture[index + 2] > 12) {
          warmHaze += 1;
        }
        if (isStrongHaze && texture[index + 2] - texture[index] > 16) {
          coolHaze += 1;
        }
      }
    }

    const centralDensity = centralStrongHaze / centralPixels;
    const outerDensity = outerStrongHaze / outerPixels;
    expect(centralDensity).toBeGreaterThan(0.4);
    expect(centralDensity).toBeLessThan(0.78);
    expect(outerDensity).toBeLessThan(0.09);
    expect(centralDensity / outerDensity).toBeGreaterThan(12);
    expect(warmHaze).toBeGreaterThan(350);
    expect(coolHaze).toBeGreaterThan(200);
  });

  it("keeps outer haze rare and uses a restrained visible-light palette", () => {
    const width = 256;
    const texture = createGalaxyTexture({ height: 256, seed: 1618, width });
    let outerPixels = 0;
    let outerHaze = 0;
    let blueGray = 0;
    let ochre = 0;
    let rose = 0;
    const chroma: number[] = [];

    for (let y = 0; y < width; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const normalizedX = (x + 0.5) / width * 2 - 1;
        const normalizedY = (y + 0.5) / width * 2 - 1;
        const radius = Math.hypot(normalizedX, normalizedY);
        const index = (y * width + x) * 4;
        const red = texture[index];
        const green = texture[index + 1];
        const blue = texture[index + 2];
        const alpha = texture[index + 3];

        if (radius > 0.55 && radius < 0.75) {
          outerPixels += 1;
          outerHaze += Number(alpha > 70);
        }
        if (radius <= 0.16 || radius >= 0.62 || alpha <= 70) continue;

        chroma.push(Math.max(red, green, blue) - Math.min(red, green, blue));
        blueGray += Number(blue - red > 7 && Math.abs(blue - green) < 26);
        ochre += Number(red - blue > 7 && green - blue > 3);
        rose += Number(red - green > 7 && blue - green > 3);
      }
    }

    chroma.sort((first, second) => first - second);
    const ninetyFifthPercentile = chroma[Math.floor(chroma.length * 0.95)];

    expect(outerHaze / outerPixels).toBeLessThan(0.003);
    expect(blueGray).toBeGreaterThan(700);
    expect(ochre).toBeGreaterThan(300);
    expect(rose).toBeLessThan(300);
    expect(ninetyFifthPercentile).toBeLessThan(95);
  });

  it("keeps broad color regions aligned across independently shaped haze layers", () => {
    const width = 256;
    const first = createGalaxyTexture({ height: 256, seed: 1_123, width });
    const second = createGalaxyTexture({ height: 256, seed: 2_089, width });
    let comparablePixels = 0;
    let matchingPixels = 0;
    const classify = (texture: Uint8Array, index: number) => {
      const red = texture[index];
      const green = texture[index + 1];
      const blue = texture[index + 2];
      if (blue - red > 7 && Math.abs(blue - green) < 26) return "slate";
      if (red - blue > 7 && green - blue > 3) return "ochre";
      if (red - green > 7 && blue - green > 3) return "mauve";
      return null;
    };

    for (let y = 0; y < width; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const normalizedX = (x + 0.5) / width * 2 - 1;
        const normalizedY = (y + 0.5) / width * 2 - 1;
        const radius = Math.hypot(normalizedX, normalizedY);
        const index = (y * width + x) * 4;
        if (
          radius < 0.18 ||
          radius > 0.62 ||
          first[index + 3] < 70 ||
          second[index + 3] < 70
        ) {
          continue;
        }
        const firstColor = classify(first, index);
        const secondColor = classify(second, index);
        if (!firstColor || !secondColor) continue;
        comparablePixels += 1;
        matchingPixels += Number(firstColor === secondColor);
      }
    }

    expect(comparablePixels).toBeGreaterThan(1_000);
    expect(matchingPixels / comparablePixels).toBeGreaterThan(0.65);
  });
});
