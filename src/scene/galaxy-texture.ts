import { createSeededRandom } from "./celestial-motion";

type GalaxyTextureOptions = {
  height: number;
  seed: number;
  width: number;
};

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const progress = clamp((value - edge0) / (edge1 - edge0));
  return progress * progress * (3 - 2 * progress);
};

const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.017) * 43_758.5453;
  return value - Math.floor(value);
};

const valueNoise = (x: number, y: number, seed: number) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(0, 1, x - x0);
  const fy = smoothstep(0, 1, y - y0);
  const top = hash(x0, y0, seed) * (1 - fx) + hash(x0 + 1, y0, seed) * fx;
  const bottom =
    hash(x0, y0 + 1, seed) * (1 - fx) +
    hash(x0 + 1, y0 + 1, seed) * fx;
  return top * (1 - fy) + bottom * fy;
};

const fractalNoise = (x: number, y: number, seed: number) => {
  let amplitude = 0.56;
  let frequency = 1;
  let result = 0;
  let normalization = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    result += valueNoise(x * frequency, y * frequency, seed + octave * 97) * amplitude;
    normalization += amplitude;
    amplitude *= 0.48;
    frequency *= 2.13;
  }
  return result / normalization;
};

export function createGalaxyTexture({
  height,
  seed,
  width,
}: GalaxyTextureOptions): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  const nextRandom = createSeededRandom(seed);

  for (let y = 0; y < height; y += 1) {
    const normalizedY = (y + 0.5) / height * 2 - 1;
    for (let x = 0; x < width; x += 1) {
      const normalizedX = (x + 0.5) / width * 2 - 1;
      const radius = Math.hypot(normalizedX, normalizedY);
      const angle = Math.atan2(normalizedY, normalizedX);
      const radialEnvelope = 1 - smoothstep(0.68, 1.04, radius);
      const bulge = Math.exp(-radius * radius * 8.5);
      const broadDisk = Math.exp(-radius * 2.25) * radialEnvelope;
      const cloudNoise = fractalNoise(
        normalizedX * 3.1 + 8.4,
        normalizedY * 3.1 - 4.7,
        seed,
      );
      const grainNoise = fractalNoise(
        normalizedX * 13.5 - 2.8,
        normalizedY * 13.5 + 7.1,
        seed + 313,
      );
      const brokenArm =
        0.5 +
        0.5 *
          Math.sin(
            angle * 4 - Math.log(radius + 0.12) * 4.2 +
              (cloudNoise - 0.5) * 4.5,
          );
      const armLight = smoothstep(0.38, 0.88, brokenArm) * broadDisk * 0.32;
      const riftNoise = fractalNoise(
        normalizedX * 5.4 + 3.7,
        normalizedY * 5.4 - 9.2,
        seed + 911,
      );
      const birthplaceNoise = fractalNoise(
        normalizedX * 4.8 - 6.1,
        normalizedY * 4.8 + 2.9,
        seed + 1_421,
      );
      const birthplaceDetail = fractalNoise(
        normalizedX * 12.5 + 4.8,
        normalizedY * 12.5 - 7.3,
        seed + 1_903,
      );
      const birthplaceWisp = fractalNoise(
        normalizedX * 3.6 + birthplaceNoise * 1.4 - 8.2,
        normalizedY * 3.6 + birthplaceDetail * 1.1 + 5.6,
        seed + 2_119,
      );
      const patchDistribution = fractalNoise(
        normalizedX * 2.7 - 3.4,
        normalizedY * 2.7 + 6.8,
        seed + 2_303,
      );
      const riftShape =
        0.5 +
        0.5 *
          Math.sin(
            angle * 3 - Math.log(radius + 0.16) * 3.35 +
              (riftNoise - 0.5) * 5.8,
          );
      const dust =
        smoothstep(0.45, 0.78, riftShape) *
        smoothstep(0.34, 0.68, riftNoise) *
        (1 - smoothstep(0.78, 1.02, radius));
      const granularity = 0.32 + cloudNoise * 0.42 + (grainNoise - 0.5) * 0.22;
      const stellarKnot =
        smoothstep(0.7, 0.9, grainNoise) *
        smoothstep(1.02, 0.22, radius) *
        0.86;
      const patchThreshold = 0.26 + Math.pow(radius, 1.8) * 1.8;
      const patchPresence = smoothstep(
        patchThreshold,
        patchThreshold + 0.14,
        patchDistribution,
      );
      const birthplaceCloud =
        patchPresence *
        smoothstep(0.3, 0.64, birthplaceNoise) *
        (0.42 + smoothstep(0.2, 0.55, birthplaceDetail) * 0.58);
      const birthplaceKnot =
        patchPresence *
        smoothstep(0.5, 0.76, birthplaceWisp) *
        smoothstep(0.38, 0.7, birthplaceDetail);
      const birthplace =
        clamp(birthplaceCloud * 0.78 + birthplaceKnot * 0.64) *
        broadDisk *
        (1 - dust * 0.82);
      const unresolvedLight = clamp(
        (broadDisk * granularity +
          bulge * 0.42 +
          armLight +
          stellarKnot * 0.42 +
          birthplace * 0.68) *
          (1 - dust * 0.58),
      );
      const warmCenter = clamp(1 - radius * 2.3);
      const coolEdge = smoothstep(0.3, 0.92, radius);
      const birthplaceTone = hash(
        Math.floor(normalizedX * 5),
        Math.floor(normalizedY * 5),
        11,
      );
      const birthplaceColorStrength =
        clamp(birthplace * 1.05 + patchPresence * broadDisk * 0.38) *
        (1 - warmCenter * 0.98);
      const birthplaceColor =
        birthplaceTone < 0.42
          ? [135, 160, 220]
          : birthplaceTone < 0.7
            ? [230, 185, 125]
            : [205, 210, 225];
      const birthplaceColorMix =
        smoothstep(0.015, 0.16, birthplaceColorStrength) *
        smoothstep(0.12, 0.25, radius) *
        0.72;
      const randomVariation = (nextRandom() - 0.5) * 4;
      const cloudEnvelope = 1 - smoothstep(0.45, 0.82, radius);
      const rawHaze = clamp(
        unresolvedLight * (0.28 + cloudEnvelope * 0.22) +
          birthplace * 1.04,
      );
      const hazeAlpha = clamp(
        smoothstep(0.05, 0.58, rawHaze) *
          (1 - bulge * 0.22) *
          (0.5 + grainNoise * 0.95) +
          birthplaceColorMix * (1 - smoothstep(0.32, 0.54, radius)) * 0.18,
      );
      const dustAlpha = clamp(
        dust * (0.28 + bulge * 0.34) * (0.72 + cloudNoise * 0.28),
      );
      const overlayAlpha = clamp(
        Math.max(hazeAlpha * (1 - dust * 0.68), dustAlpha),
      );
      const dustMix = clamp(dustAlpha / Math.max(0.001, overlayAlpha));
      const baseRed = 218 + warmCenter * 22 - coolEdge * 7 + randomVariation;
      const baseGreen = 216 + warmCenter * 9 - coolEdge * 3 + randomVariation;
      const baseBlue = 235 - warmCenter * 4 + coolEdge * 9 + randomVariation;
      const lightRed =
        baseRed * (1 - birthplaceColorMix) + birthplaceColor[0] * birthplaceColorMix;
      const lightGreen =
        baseGreen * (1 - birthplaceColorMix) + birthplaceColor[1] * birthplaceColorMix;
      const lightBlue =
        baseBlue * (1 - birthplaceColorMix) + birthplaceColor[2] * birthplaceColorMix;
      const index = (y * width + x) * 4;

      data[index] = Math.round(
        clamp(lightRed * (1 - dustMix) + 8 * dustMix, 0, 255),
      );
      data[index + 1] = Math.round(
        clamp(lightGreen * (1 - dustMix) + 10 * dustMix, 0, 255),
      );
      data[index + 2] = Math.round(
        clamp(lightBlue * (1 - dustMix) + 18 * dustMix, 0, 255),
      );
      data[index + 3] = Math.round(overlayAlpha * 224);
    }
  }

  return data;
}
