import type { UniverseView } from "./navigation";

export const BACKGROUND_STAR_COUNT = 330;
export const GALACTIC_BAND_STAR_COUNT = 620;

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
    x: signedVelocity * 0.42,
    y: signedVelocity * 0.16,
  };
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
    const x = nextRandom();
    const centerY = 0.73 - x * 0.42;
    const planeOffset =
      ((nextRandom() + nextRandom() + nextRandom()) / 3 - 0.5) * 0.24;
    const y = clamp(centerY + planeOffset, 0, 1);
    const distanceFromPlane = Math.abs(planeOffset);
    const inDustLane =
      ((x >= 0.34 && x <= 0.47) || (x >= 0.69 && x <= 0.77)) &&
      distanceFromPlane < 0.045;
    const clusterLift =
      0.82 +
      Math.max(0, Math.sin(x * Math.PI * 7.2 + 0.8)) * 0.28;
    const planeLift = 1 - Math.min(0.58, distanceFromPlane * 2.6);
    const dustAttenuation = inDustLane ? 0.24 : 1;
    const temperature: BackgroundStarTemperature =
      index % 11 === 0 ? "warm" : index % 5 === 0 ? "cool" : "neutral";

    return {
      x,
      y,
      alpha: clamp(
        (0.08 + nextRandom() * 0.21) *
          clusterLift *
          planeLift *
          dustAttenuation,
        0.018,
        0.3,
      ),
      size: 0.32 + nextRandom() * 0.64,
      temperature,
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
