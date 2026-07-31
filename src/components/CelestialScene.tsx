import {
  type CSSProperties,
  type PropsWithChildren,
  useEffect,
  useRef,
} from "react";

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
  type Meteor,
} from "../celestial-motion";
import type { Point } from "../content/site-content";
import type { UniverseView } from "../navigation";
import type { NarrativeWheelInput } from "../wheel-input";

type CelestialSceneProps = PropsWithChildren<{
  cameraOrigin: Point;
  interactive: boolean;
  view: UniverseView;
  onOpenSkyWheel?: (input: NarrativeWheelInput) => void;
}>;

const wrap = (value: number, extent: number) =>
  ((value % extent) + extent) % extent;

export function CelestialScene({
  cameraOrigin,
  children,
  interactive,
  onOpenSkyWheel,
  view,
}: CelestialSceneProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveRef = useRef(interactive);
  const openSkyWheelRef = useRef(onOpenSkyWheel);
  const motionRef = useRef<CelestialMotion>({
    travel: 0,
    travelVelocity: 0,
  });

  useEffect(() => {
    interactiveRef.current = interactive;
    openSkyWheelRef.current = onOpenSkyWheel;
  }, [interactive, onOpenSkyWheel]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (!interactiveRef.current || event.ctrlKey) {
        return;
      }
      motionRef.current = applyWheelImpulse(motionRef.current, event.deltaY);
      const target = event.target;
      if (target instanceof Element && target.closest("[data-story-scroll]")) {
        return;
      }
      openSkyWheelRef.current?.({
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
      });
      event.preventDefault();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || !window.requestAnimationFrame) {
      return;
    }

    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      false;
    if (reducedMotion) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const nextRandom = createSeededRandom(270731);
    const stars = createStarField(310, nextRandom);
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let frameId = 0;
    let lastTime = performance.now();
    let meteor: Meteor | null = null;
    let nextMeteorAt = lastTime + 1_000;

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawStars = (now: number) => {
      for (const star of stars) {
        const displacement = parallaxDisplacement(
          motionRef.current.travel,
          star.depth,
          star.phase,
        );
        const x = wrap(star.x * width + displacement.x, width + 80) - 40;
        const y = wrap(star.y * height + displacement.y, height + 80) - 40;
        const parallax = 1 / star.depth;
        const twinkle = 0.62 + Math.sin(now * 0.0011 + star.phase) * 0.16;
        const alpha = Math.min(
          0.82,
          (0.28 + 0.43 * parallax) * twinkle,
        );
        const radius =
          star.size * Math.min(1.35, 0.62 + parallax * 0.35);

        context.beginPath();
        context.fillStyle = `rgba(${star.light},${star.light + 5},${Math.min(255, star.light + 18)},${alpha})`;
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    };

    const drawMeteor = (now: number) => {
      if (!meteor && now >= nextMeteorAt) {
        meteor = createMeteor(nextRandom, width, height, now);
      }
      if (!meteor) {
        return;
      }

      const segment = meteorSegment(meteor, now);
      if (!segment) {
        meteor = null;
        nextMeteorAt = now + 2_600 + nextRandom() * 4_300;
        return;
      }

      const gradient = context.createLinearGradient(
        segment.tail.x,
        segment.tail.y,
        segment.head.x,
        segment.head.y,
      );
      gradient.addColorStop(0, "rgba(215,224,255,0)");
      gradient.addColorStop(
        0.72,
        `rgba(222,230,255,${0.42 * segment.alpha})`,
      );
      gradient.addColorStop(
        1,
        `rgba(255,255,255,${0.95 * segment.alpha})`,
      );

      context.save();
      context.lineCap = "round";
      context.lineWidth = 1.15;
      context.strokeStyle = gradient;
      context.shadowColor = `rgba(188,205,255,${0.65 * segment.alpha})`;
      context.shadowBlur = 8;
      context.beginPath();
      context.moveTo(segment.tail.x, segment.tail.y);
      context.lineTo(segment.head.x, segment.head.y);
      context.stroke();
      context.restore();
    };

    const drawFrame = (now: number) => {
      const elapsed = now - lastTime;
      lastTime = now;
      motionRef.current = advanceCelestialMotion(motionRef.current, elapsed);
      const drift = constellationDrift(motionRef.current.travelVelocity);
      context.clearRect(0, 0, width, height);
      drawStars(now);
      drawMeteor(now);
      root.style.setProperty(
        "--constellation-pull-x",
        `${drift.x}px`,
      );
      root.style.setProperty(
        "--constellation-pull-y",
        `${drift.y}px`,
      );
      frameId = window.requestAnimationFrame(drawFrame);
    };

    resize();
    window.addEventListener("resize", resize);
    frameId = window.requestAnimationFrame(drawFrame);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <main
      className="universe"
      data-view={view}
      ref={rootRef}
      style={
        {
          "--camera-origin-x": `${cameraOrigin[0]}%`,
          "--camera-origin-y": `${cameraOrigin[1]}%`,
          "--constellation-pull-x": "0px",
          "--constellation-pull-y": "0px",
        } as CSSProperties
      }
    >
      <canvas
        className="celestial-field"
        data-testid="celestial-field"
        ref={canvasRef}
        aria-hidden="true"
      />
      {children}
    </main>
  );
}
