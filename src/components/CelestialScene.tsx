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
  dampPoint,
  directionalConstellationDrift,
  meteorSegment,
  parallaxDisplacement,
  type CelestialMotion,
  type Meteor,
  type Point2d,
  type WorldCamera,
} from "../celestial-motion";
import {
  CelestialMotionProvider,
  createCelestialMotionChannel,
  type CelestialMotionChannel,
} from "../celestial-motion-channel";
import type { UniverseView } from "../navigation";
import type { NarrativeWheelInput } from "../wheel-input";

type CelestialSceneProps = PropsWithChildren<{
  camera: WorldCamera;
  constellationDirection: Point2d;
  interactive: boolean;
  view: UniverseView;
  onOpenSkyWheel?: (input: NarrativeWheelInput) => void;
}>;

const wrap = (value: number, extent: number) =>
  ((value % extent) + extent) % extent;

const starTemperature = {
  warm: [255, 224, 190],
  neutral: [225, 232, 245],
  cool: [190, 208, 255],
} as const;

export function CelestialScene({
  camera,
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
    let renderedPull = { x: 0, y: 0 };

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
        const twinkle =
          0.72 + Math.sin(now * 0.00085 + star.phase) * star.twinkle;
        const alpha = Math.min(
          star.tier === "anchor" ? 0.92 : 0.78,
          (0.24 + 0.4 * parallax) * twinkle,
        );
        const radius =
          star.size * Math.min(1.35, 0.62 + parallax * 0.35);
        const temperature = starTemperature[star.temperature];
        const brightness = star.light / 255;
        const red = Math.round(temperature[0] * brightness);
        const green = Math.round(temperature[1] * brightness);
        const blue = Math.round(temperature[2] * brightness);

        context.save();
        if (star.tier !== "faint") {
          context.shadowColor = `rgba(${red},${green},${blue},${alpha * 0.65})`;
          context.shadowBlur = star.tier === "anchor" ? 9 : 4;
        }
        context.beginPath();
        context.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();

        if (star.double) {
          const separation = radius * 2.8;
          const companionX = x + Math.cos(star.phase) * separation;
          const companionY = y + Math.sin(star.phase) * separation;
          context.beginPath();
          context.arc(companionX, companionY, radius * 0.48, 0, Math.PI * 2);
          context.fill();
        }

        if (star.tier === "anchor") {
          const ray = radius * 4.2;
          context.shadowBlur = 0;
          context.strokeStyle = `rgba(${red},${green},${blue},${alpha * 0.2})`;
          context.lineWidth = 0.45;
          context.beginPath();
          context.moveTo(x - ray, y);
          context.lineTo(x + ray, y);
          context.moveTo(x, y - ray);
          context.lineTo(x, y + ray);
          context.stroke();
        }
        context.restore();
      }
    };

    if (reducedMotion) {
      const drawStaticField = () => {
        resize();
        context.clearRect(0, 0, width, height);
        drawStars(0);
      };
      drawStaticField();
      window.addEventListener("resize", drawStaticField);
      return () => window.removeEventListener("resize", drawStaticField);
    }

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
      const targetPull =
        viewRef.current === "universe"
          ? constellationDrift(backgroundMotionRef.current.travelVelocity)
          : directionalConstellationDrift(
              localMotionRef.current.travelVelocity,
              directionRef.current,
            );
      renderedPull = dampPoint(renderedPull, targetPull, elapsed);
      context.clearRect(0, 0, width, height);
      drawStars(now);
      drawMeteor(now);
      root.style.setProperty(
        "--constellation-pull-x",
        `${renderedPull.x}px`,
      );
      root.style.setProperty(
        "--constellation-pull-y",
        `${renderedPull.y}px`,
      );
      motionChannel.publish(renderedPull);
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
            "--camera-origin-x": `${camera.origin.x}%`,
            "--camera-origin-y": `${camera.origin.y}%`,
            "--camera-scale": camera.scale,
            "--camera-inverse-scale": 1 / camera.scale,
            "--constellation-pull-x": "0px",
            "--constellation-pull-y": "0px",
          } as CSSProperties
        }
        data-camera-focused={camera.focused ? "true" : undefined}
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
