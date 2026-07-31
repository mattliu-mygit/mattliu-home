import { createContext, useContext } from "react";

import type { Point2d } from "./celestial-motion";

type CelestialMotionListener = (pull: Point2d) => void;

export type CelestialMotionChannel = {
  current: () => Point2d;
  publish: (pull: Point2d) => void;
  subscribe: (listener: CelestialMotionListener) => () => void;
};

const MOTION_EPSILON = 0.01;

const normalizePull = ({ x, y }: Point2d): Point2d => ({
  x: Math.abs(x) < MOTION_EPSILON ? 0 : x,
  y: Math.abs(y) < MOTION_EPSILON ? 0 : y,
});

export function createCelestialMotionChannel(): CelestialMotionChannel {
  let currentPull: Point2d = { x: 0, y: 0 };
  const listeners = new Set<CelestialMotionListener>();

  return {
    current: () => currentPull,
    publish(pull) {
      const nextPull = normalizePull(pull);
      if (
        Math.abs(nextPull.x - currentPull.x) < MOTION_EPSILON &&
        Math.abs(nextPull.y - currentPull.y) < MOTION_EPSILON
      ) {
        return;
      }
      currentPull = nextPull;
      listeners.forEach((listener) => listener(currentPull));
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(currentPull);
      return () => listeners.delete(listener);
    },
  };
}

const CelestialMotionContext = createContext<CelestialMotionChannel | null>(
  null,
);

export const CelestialMotionProvider = CelestialMotionContext.Provider;

export const useCelestialMotionChannel = () =>
  useContext(CelestialMotionContext);
