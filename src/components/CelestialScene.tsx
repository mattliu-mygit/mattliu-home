import {
  type CSSProperties,
  type PropsWithChildren,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import {
  advanceCelestialMotion,
  applyWheelImpulse,
  constellationDrift,
  createMeteor,
  createSeededRandom,
  createStarField,
  directionalConstellationDrift,
  meteorSegment,
  parallaxDisplacement,
  type CelestialMotion,
  type Meteor,
  type Point2d,
} from "../celestial-motion";
import {
  CelestialMotionProvider,
  createCelestialMotionChannel,
  type CelestialMotionChannel,
} from "../celestial-motion-channel";
import type { Point } from "../content/site-content";
import type { UniverseView } from "../navigation";
import type { NarrativeWheelInput } from "../wheel-input";

type CelestialSceneProps = PropsWithChildren<{
  cameraOrigin: Point;
  constellationDirection: Point2d;
  interactive: boolean;
  view: UniverseView;
  onOpenSkyWheel?: (input: NarrativeWheelInput) => void;
}>;

const wrap = (value: number, extent: number) =>
  ((value % extent) + extent) % extent;

export function CelestialScene({
  cameraOrigin,
  children,
  constellationDirection,
  interactive,
  onOpenSkyWheel,
  view,
}: CelestialSceneProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveRef = useRef(interactive);
  const openSkyWheelRef = useRef(onOpenSkyWheel);
  const viewRef = useRef(view);
  const directionRef = useRef(constellationDirection);
  const motionChannelRef = useRef<CelestialMotionChannel | null>(null);
  if (!motionChannelRef.current) {
    motionChannelRef.current = createCelestialMotionChannel();
  }
  const motionChannel = motionChannelRef.current;
  const backgroundMotionRef = useRef<CelestialMotion>({
    travel: 0,
    travelVelocity: 0,
  });
  const localMotionRef = useRef<CelestialMotion>({
    travel: 0,
    travelVelocity: 0,
  });

  useLayoutEffect(() => {
    interactiveRef.current = interactive;
    openSkyWheelRef.current = onOpenSkyWheel;
    directionRef.current = constellationDirection;
    if (viewRef.current !== view) {
      localMotionRef.current = { travel: 0, travelVelocity: 0 };
      motionChannel.publish({ x: 0, y: 0 });
      rootRef.current?.style.setProperty("--constellation-pull-x", "0px");
      rootRef.current?.style.setProperty("--constellation-pull-y", "0px");
      if (view !== "universe") {
        backgroundMotionRef.current = {
          ...backgroundMotionRef.current,
          travelVelocity:
            backgroundMotionRef.current.travelVelocity * 0.12,
        };
      }
    }
    viewRef.current = view;
  }, [
    constellationDirection,
    interactive,
    motionChannel,
    onOpenSkyWheel,
    view,
  ]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (!interactiveRef.current || event.ctrlKey) {
        return;
      }
      const inUniverse = viewRef.current === "universe";
      backgroundMotionRef.current = applyWheelImpulse(
        backgroundMotionRef.current,
        inUniverse ? event.deltaY : event.deltaY * 0.12,
      );
      localMotionRef.current = applyWheelImpulse(
        localMotionRef.current,
        event.deltaY,
      );
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
          backgroundMotionRef.current.travel,
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
      backgroundMotionRef.current = advanceCelestialMotion(
        backgroundMotionRef.current,
        elapsed,
      );
      localMotionRef.current = advanceCelestialMotion(
        localMotionRef.current,
        elapsed,
      );
      const drift =
        viewRef.current === "universe"
          ? constellationDrift(backgroundMotionRef.current.travelVelocity)
          : directionalConstellationDrift(
              localMotionRef.current.travelVelocity,
              directionRef.current,
            );
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
      motionChannel.publish(drift);
      frameId = window.requestAnimationFrame(drawFrame);
    };

    resize();
    window.addEventListener("resize", resize);
    frameId = window.requestAnimationFrame(drawFrame);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [motionChannel]);

  return (
    <CelestialMotionProvider value={motionChannel}>
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
    </CelestialMotionProvider>
  );
}
