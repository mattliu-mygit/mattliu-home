import { createSeededRandom } from "../motion/celestial-motion";

export type GalaxyField = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
};

type GalaxyFieldOptions = {
  count: number;
  seed: number;
};

export const GALAXY_DISK_RADIUS = 13;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const signedExponential = (
  scale: number,
  nextRandom: () => number,
) => {
  const magnitude = -Math.log(Math.max(0.000_001, 1 - nextRandom())) * scale;
  return magnitude * (nextRandom() < 0.5 ? -1 : 1);
};

const diskRadius = (nextRandom: () => number) => {
  for (;;) {
    const radius =
      -Math.log(
        Math.max(0.000_001, nextRandom() * nextRandom()),
      ) * 2.5;
    if (radius <= GALAXY_DISK_RADIUS) {
      return radius;
    }
  }
};

const writeColor = (
  target: Float32Array,
  index: number,
  color: readonly [number, number, number],
  variation: number,
) => {
  target[index * 3] = clamp(color[0] + variation, 0, 1);
  target[index * 3 + 1] = clamp(color[1] + variation, 0, 1);
  target[index * 3 + 2] = clamp(color[2] + variation, 0, 1);
};

export function galaxyPointCountFor(viewportWidth: number): number {
  return viewportWidth < 720 ? 11_000 : 26_000;
}

export function createGalaxyField({
  count,
  seed,
}: GalaxyFieldOptions): GalaxyField {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const nextRandom = createSeededRandom(seed);

  for (let index = 0; index < count; index += 1) {
    const layerRoll = nextRandom();
    const isBulge = layerRoll < 0.375;
    const isThickDisk = !isBulge && layerRoll < 0.505;
    let x: number;
    let y: number;
    let z: number;
    let radius: number;

    if (isBulge) {
      radius = Math.pow(nextRandom(), 2.18) * 3.45;
      const azimuth = nextRandom() * Math.PI * 2;
      const elevation = Math.asin(nextRandom() * 2 - 1);
      x = Math.cos(elevation) * Math.cos(azimuth) * radius;
      z = Math.cos(elevation) * Math.sin(azimuth) * radius;
      y = Math.sin(elevation) * radius * 0.5;
    } else {
      radius = diskRadius(nextRandom);
      const followsArm = nextRandom() < 0.68;
      const arm = Math.floor(nextRandom() * 4);
      const baseAngle =
        arm * (Math.PI / 2) + Math.log(radius + 0.65) * 1.28;
      const angle = followsArm
        ? baseAngle + signedExponential(0.16 + radius * 0.012, nextRandom)
        : nextRandom() * Math.PI * 2;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      y = clamp(
        signedExponential(isThickDisk ? 0.54 : 0.14, nextRandom),
        -2.55,
        2.55,
      );
    }

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;

    const radialFade =
      1 - Math.pow(clamp(radius / GALAXY_DISK_RADIUS, 0, 1), 1.4);
    const planeDistance = Math.abs(y);
    const dustPhase = Math.sin(
      Math.atan2(z, x) * 4 - Math.log(radius + 0.8) * 5.1 +
        Math.sin(radius * 1.7) * 0.8,
    );
    const dustIrregularity =
      Math.sin(x * 0.83 + z * 0.37 + Math.sin(z * 0.61) * 1.7) * 0.45;
    const inDustLane =
      !isBulge &&
      planeDistance < 0.55 &&
      dustPhase + dustIrregularity > 0.35;
    const variation = (nextRandom() - 0.5) * 0.09;

    if (isBulge || (radius < 2.2 && nextRandom() < 0.62)) {
      writeColor(colors, index, [1, 0.83, 0.67], variation * 0.7);
    } else if (nextRandom() < 0.7) {
      writeColor(colors, index, [0.75, 0.82, 1], variation * 0.7);
    } else if (nextRandom() < 0.72) {
      writeColor(colors, index, [0.88, 0.77, 0.94], variation * 0.7);
    } else {
      writeColor(colors, index, [0.97, 0.89, 0.76], variation * 0.7);
    }

    const centralAttenuation = isBulge
      ? 0.27 + clamp(radius / 3.45, 0, 1) * 0.33
      : 1;
    const projectedRadius = Math.hypot(x, z);
    const centralVisibility =
      0.1 + 0.9 * Math.pow(clamp(projectedRadius / 3, 0, 1), 1.2);
    const pointSize = isBulge
      ? 0.58 + nextRandom() * 1.12
      : 0.72 + nextRandom() * (nextRandom() > 0.978 ? 2.7 : 1.16);
    sizes[index] =
      projectedRadius < 1.5
        ? Math.min(pointSize, 0.62 + projectedRadius * 0.32)
        : pointSize;
    alphas[index] = clamp(
      (0.22 + radialFade * 0.54 + nextRandom() * 0.2) *
        centralAttenuation *
        centralVisibility *
        (isThickDisk ? 0.58 : 1) *
        (inDustLane ? 0.16 : 1),
      0.08,
      1,
    );
  }

  return { positions, colors, sizes, alphas };
}
