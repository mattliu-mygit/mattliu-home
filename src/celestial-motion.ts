import type { UniverseView } from "./navigation";

export const BACKGROUND_STAR_COUNT = 330;
export const GALACTIC_BAND_STAR_COUNT = 6_000;

export type CelestialMotion = {
  travel: number;
  travelVelocity: number;
};

export type Point2d = {
  x: number;
  y: number;
};

export type WorldCamera = {
  origin: Point2d;
  scale: number;
  focused: boolean;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type BackgroundStarTier = "faint" | "medium" | "anchor";
export type BackgroundStarTemperature = "warm" | "neutral" | "cool";

export type BackgroundStar = Point2d & {
  depth: number;
  size: number;
  light: number;
  phase: number;
  tier: BackgroundStarTier;
  temperature: BackgroundStarTemperature;
  twinkle: number;
  double: boolean;
};

export type GalacticBandStar = Point2d & {
  alpha: number;
  size: number;
  temperature: BackgroundStarTemperature;
};

export type GalacticCloud = Point2d & {
  alpha: number;
  radiusX: number;
  radiusY: number;
  temperature: BackgroundStarTemperature;
};

export type GalacticDustPatch = Point2d & {
  alpha: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
};

export type MeteorEdge = "top" | "left" | "right";

export type Meteor = {
  edge: MeteorEdge;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  trail: number;
};

const backgroundStarProfiles = {
  anchor: {
    minimumSize: 0.96,
    sizeRange: 0.35,
    minimumLight: 190,
    lightRange: 30,
  },
  medium: {
    minimumSize: 0.616,
    sizeRange: 0.308,
    minimumLight: 175,
    lightRange: 35,
  },
  faint: {
    minimumSize: 0.264,
    sizeRange: 0.308,
    minimumLight: 125,
    lightRange: 35,
  },
} as const satisfies Record<
  BackgroundStarTier,
  {
    minimumSize: number;
    sizeRange: number;
    minimumLight: number;
    lightRange: number;
  }
>;

const frameDuration = 1000 / 60;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function worldCameraFor(
  view: UniverseView,
  destination: Point2d,
): WorldCamera {
  return view === "universe"
    ? { origin: { x: 50, y: 50 }, scale: 1, focused: false }
    : { origin: destination, scale: 3.4, focused: true };
}

export function applyWheelImpulse(
  motion: CelestialMotion,
  deltaY: number,
): CelestialMotion {
  const impulse = clamp(deltaY, -80, 80);
  return {
    ...motion,
    travelVelocity: motion.travelVelocity + impulse * 0.0045,
  };
}

export function advanceCelestialMotion(
  motion: CelestialMotion,
  elapsedMs: number,
): CelestialMotion {
  const frames = clamp(elapsedMs, 0, 32) / frameDuration;

  return {
    travel: motion.travel + motion.travelVelocity * elapsedMs,
    travelVelocity:
      motion.travelVelocity * Math.pow(0.986, frames),
  };
}

export function constellationDrift(travelVelocity: number): Point2d {
  const signedVelocity = clamp(travelVelocity, -1.8, 1.8);
  return {
    x: signedVelocity * 10,
    y: signedVelocity * 4.2,
  };
}

export function directionalConstellationDrift(
  travelVelocity: number,
  direction: Point2d,
): Point2d {
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0 || travelVelocity === 0) {
    return { x: 0, y: 0 };
  }

  const magnitude = clamp(Math.abs(travelVelocity), 0, 1.8) * 10;
  return {
    x: (direction.x / length) * magnitude,
    y: (direction.y / length) * magnitude,
  };
}

export function dampPoint(
  current: Point2d,
  target: Point2d,
  elapsedMs: number,
  responseMs = 120,
): Point2d {
  const alpha = 1 - Math.exp(-Math.max(0, elapsedMs) / responseMs);
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
  };
}

export function constellationFocusPoint(
  from: Point2d,
  to: Point2d,
  progress: number,
): Point2d {
  const boundedProgress = clamp(progress, 0, 1);
  const eased = boundedProgress * boundedProgress * (3 - 2 * boundedProgress);
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
  };
}

export function constellationFocusOffset(focus: Point2d): Point2d {
  return {
    x: clamp((50 - focus.x) * 0.08, -4, 4),
    y: clamp((50 - focus.y) * 0.06, -3, 3),
  };
}

export function projectConstellationPoint(
  position: readonly [number, number],
  depth: number,
  pull: Point2d,
  viewport: ViewportSize,
): readonly [number, number] {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return position;
  }

  const parallax = 1 / depth;
  return [
    position[0] + (pull.x / viewport.width) * 100 * parallax,
    position[1] + (pull.y / viewport.height) * 100 * parallax,
  ];
}

export function parallaxDisplacement(
  travel: number,
  depth: number,
  phase: number,
): Point2d {
  const parallax = 1 / depth;
  const curve = Math.sin(travel * 0.0014 + phase) * 7 * parallax;
  return {
    x: travel * 0.16 * parallax + curve,
    y: travel * 0.065 * parallax + curve * 0.26,
  };
}

export function galacticBandDisplacement(travelVelocity: number): Point2d {
  const signedVelocity = clamp(travelVelocity, -1.8, 1.8);
  return {
    x: signedVelocity * 0.14,
    y: signedVelocity * 0.05,
  };
}

export function galacticBandRotation(travelVelocity: number): number {
  return clamp(travelVelocity, -1.8, 1.8) * 0.0011;
}

export function galacticPlaneY(x: number): number {
  return 0.18 + x * 0.5;
}

export function galacticBandHalfWidth(x: number): number {
  const centralBulge = Math.exp(-Math.pow((x - 0.6) / 0.3, 2));
  return 0.16 + centralBulge * 0.26;
}

export function galacticDustAttenuation(
  x: number,
  distanceFromPlane: number,
): number {
  const crossesDustLane =
    ((x >= 0.34 && x <= 0.47) || (x >= 0.69 && x <= 0.77)) &&
    distanceFromPlane < galacticBandHalfWidth(x) * 0.14;
  return crossesDustLane ? 0.56 : 1;
}

export function advanceGalaxyPresence(
  current: number,
  active: boolean,
  elapsedMs: number,
): number {
  if (elapsedMs <= 0) {
    return current;
  }

  const target = active ? 1 : 0;
  const alpha = 1 - Math.exp(-elapsedMs / 420);
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < 0.001 ? target : clamp(next, 0, 1);
}

export function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createStarField(
  count: number,
  nextRandom: () => number,
): BackgroundStar[] {
  const anchorCount = Math.round(count * 0.04);
  const mediumCount = Math.round(count * 0.16);

  return Array.from({ length: count }, (_, index) => {
    const depth = 0.35 + nextRandom() * 1.9;
    const inDensePocket = nextRandom() < 0.24;
    const tier: BackgroundStarTier =
      index < anchorCount
        ? "anchor"
        : index < anchorCount + mediumCount
          ? "medium"
          : "faint";
    const temperatureRoll = nextRandom();
    const temperature: BackgroundStarTemperature =
      temperatureRoll < 0.14
        ? "warm"
        : temperatureRoll < 0.48
          ? "cool"
          : "neutral";
    const profile = backgroundStarProfiles[tier];
    return {
      x: inDensePocket
        ? 0.48 + (nextRandom() - 0.5) * 0.7
        : nextRandom(),
      y: inDensePocket
        ? 0.48 + (nextRandom() - 0.5) * 0.52
        : nextRandom(),
      depth,
      size: (profile.minimumSize + nextRandom() * profile.sizeRange) * 1.07,
      light:
        profile.minimumLight + Math.round(nextRandom() * profile.lightRange),
      phase: nextRandom() * Math.PI * 2,
      tier,
      temperature,
      twinkle: 0.006 + nextRandom() * (tier === "faint" ? 0.024 : 0.012),
      double:
        (tier === "anchor" && index % 2 === 0) ||
        (tier === "medium" && nextRandom() < 0.05),
    };
  });
}

export function createGalacticBand(
  count: number,
  nextRandom: () => number,
): GalacticBandStar[] {
  return Array.from({ length: count }, (_, index) => {
    const baseX = nextRandom();
    const x =
      nextRandom() < 0.38
        ? clamp(0.6 + (nextRandom() - 0.5) * 0.48, 0, 1)
        : baseX;
    const centerY = galacticPlaneY(x);
    const halfWidth = galacticBandHalfWidth(x);
    const planeOffset =
      ((nextRandom() + nextRandom() + nextRandom()) / 3 - 0.5) *
      halfWidth *
      2;
    const y = clamp(centerY + planeOffset, 0, 1);
    const distanceFromPlane = Math.abs(planeOffset);
    const bulgeLift = Math.exp(-Math.pow((x - 0.6) / 0.22, 2));
    const clusterLift =
      0.88 +
      Math.max(0, Math.sin(x * Math.PI * 7.2 + 0.8)) * 0.22;
    const planeLift =
      1 - Math.min(0.4, (distanceFromPlane / halfWidth) * 0.4);
    const dustAttenuation = galacticDustAttenuation(x, distanceFromPlane);
    const temperatureIndex = index % 20;
    const temperature: BackgroundStarTemperature =
      temperatureIndex < 4
        ? "warm"
        : temperatureIndex < 11
          ? "cool"
          : "neutral";

    return {
      x,
      y,
      alpha: clamp(
        (0.15 + nextRandom() * 0.34) *
          clusterLift *
          planeLift *
          (1 + bulgeLift * 0.36) *
          dustAttenuation,
        0.025,
        0.62,
      ),
      size: (0.24 + nextRandom() * 0.62) * (1 + bulgeLift * 0.08),
      temperature,
    };
  });
}

export function createGalacticClouds(
  count: number,
  nextRandom: () => number,
): GalacticCloud[] {
  return Array.from({ length: count }, (_, index) => {
    const x = clamp(
      (index + 0.5) / count + (nextRandom() - 0.5) * 0.025,
      0,
      1,
    );
    const centralBulge = Math.exp(-Math.pow((x - 0.54) / 0.28, 2));
    const halfWidth = galacticBandHalfWidth(x);
    const temperatureIndex = index % 10;
    const temperature: BackgroundStarTemperature =
      temperatureIndex < 2
        ? "warm"
        : temperatureIndex < 7
          ? "cool"
          : "neutral";

    return {
      x,
      y: clamp(
        galacticPlaneY(x) + (nextRandom() - 0.5) * halfWidth * 0.16,
        0,
        1,
      ),
      radiusX: 0.05 + centralBulge * 0.04 + nextRandom() * 0.03,
      radiusY: 0.04 + centralBulge * 0.055 + nextRandom() * 0.025,
      alpha: clamp(
        0.018 + centralBulge * 0.1 + nextRandom() * 0.035,
        0.018,
        0.16,
      ),
      temperature,
    };
  });
}

export function createGalacticDustPatches(
  count: number,
  nextRandom: () => number,
): GalacticDustPatch[] {
  const segmentCount = 8;
  return Array.from({ length: count }, (_, index) => {
    const segment = index % segmentCount;
    const segmentStart = 0.04 + segment * 0.12;
    const x = clamp(segmentStart + nextRandom() * 0.075, 0, 1);
    const halfWidth = galacticBandHalfWidth(x);
    const offset =
      ((nextRandom() + nextRandom()) / 2 - 0.5) * halfWidth * 0.34;

    return {
      x,
      y: clamp(galacticPlaneY(x) + offset, 0, 1),
      radiusX: 0.008 + nextRandom() * 0.026,
      radiusY: 0.003 + nextRandom() * 0.009,
      rotation: (nextRandom() - 0.5) * 1.4,
      alpha: 0.06 + nextRandom() * 0.18,
    };
  });
}

export function createMeteor(
  nextRandom: () => number,
  width: number,
  height: number,
  now: number,
): Meteor {
  const edges: readonly MeteorEdge[] = ["top", "left", "right"];
  const edge = edges[Math.min(2, Math.floor(nextRandom() * edges.length))];
  const edgePosition = nextRandom();
  const targetOffset = nextRandom() - 0.5;
  let x: number;
  let y: number;
  let targetX: number;
  let targetY: number;

  if (edge === "top") {
    x = width * (0.1 + edgePosition * 0.8);
    y = -30;
    targetX = clamp(x + targetOffset * width * 0.9, 0, width);
    targetY = height * (0.45 + nextRandom() * 0.35);
  } else if (edge === "left") {
    x = -40;
    y = height * (0.08 + edgePosition * 0.66);
    targetX = width * (0.55 + nextRandom() * 0.35);
    targetY = clamp(y + targetOffset * height * 0.8, 0, height);
  } else {
    x = width + 40;
    y = height * (0.08 + edgePosition * 0.66);
    targetX = width * (0.1 + nextRandom() * 0.35);
    targetY = clamp(y + targetOffset * height * 0.8, 0, height);
  }

  const directionX = targetX - x;
  const directionY = targetY - y;
  const magnitude = Math.hypot(directionX, directionY);
  const speed = 720 + nextRandom() * 480;

  return {
    edge,
    x,
    y,
    vx: (directionX / magnitude) * speed,
    vy: (directionY / magnitude) * speed,
    born: now,
    life: 0.52 + nextRandom() * 0.38,
    trail: 65 + nextRandom() * 105,
  };
}

export function meteorSegment(
  meteor: Pick<
    Meteor,
    "x" | "y" | "vx" | "vy" | "born" | "life" | "trail"
  >,
  now: number,
) {
  const age = (now - meteor.born) / 1000;
  if (age < 0 || age >= meteor.life) {
    return null;
  }

  const acceleration = 1 + age * 1.7;
  const distance = age * acceleration;
  const head = {
    x: meteor.x + meteor.vx * distance,
    y: meteor.y + meteor.vy * distance,
  };
  const magnitude = Math.hypot(meteor.vx, meteor.vy);
  const direction = {
    x: meteor.vx / magnitude,
    y: meteor.vy / magnitude,
  };
  const trailLength = meteor.trail * Math.min(1, age * 8);

  return {
    head,
    tail: {
      x: head.x - direction.x * trailLength,
      y: head.y - direction.y * trailLength,
    },
    alpha: Math.sin((Math.PI * age) / meteor.life),
  };
}
