export type CelestialMotion = {
  travel: number;
  travelVelocity: number;
  pull: number;
  pullVelocity: number;
};

export type Point2d = {
  x: number;
  y: number;
};

export type BackgroundStar = Point2d & {
  depth: number;
  size: number;
  light: number;
  phase: number;
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

const frameDuration = 1000 / 60;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function applyWheelImpulse(
  motion: CelestialMotion,
  deltaY: number,
): CelestialMotion {
  const impulse = clamp(deltaY, -80, 80);
  return {
    ...motion,
    travelVelocity: motion.travelVelocity + impulse * 0.0045,
    pullVelocity: motion.pullVelocity + impulse * 0.024,
  };
}

export function advanceCelestialMotion(
  motion: CelestialMotion,
  elapsedMs: number,
): CelestialMotion {
  const frames = clamp(elapsedMs, 0, 32) / frameDuration;
  const pullAcceleration = -motion.pull * 0.09 - motion.pullVelocity * 0.24;
  const pullVelocity =
    motion.pullVelocity + pullAcceleration * frames;

  return {
    travel: motion.travel + motion.travelVelocity * elapsedMs,
    travelVelocity:
      motion.travelVelocity * Math.pow(0.986, frames),
    pull: motion.pull + pullVelocity * frames,
    pullVelocity,
  };
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
  return Array.from({ length: count }, (_, index) => {
    const depth = 0.35 + nextRandom() * 1.9;
    const inDensePocket = index < Math.round(count * 0.24);
    return {
      x: inDensePocket
        ? 0.48 + (nextRandom() - 0.5) * 0.7
        : nextRandom(),
      y: inDensePocket
        ? 0.48 + (nextRandom() - 0.5) * 0.52
        : nextRandom(),
      depth,
      size: 0.35 + nextRandom() * (depth < 0.7 ? 1.25 : 0.7),
      light: 135 + Math.round(nextRandom() * 95),
      phase: nextRandom() * Math.PI * 2,
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
