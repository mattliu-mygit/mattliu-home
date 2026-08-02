import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { createGalaxyField, galaxyPointCountFor } from "../galaxy-field";
import type {
  GalaxyFrame,
  GalaxyRenderer,
} from "../galaxy-renderer";

export type GalaxyFieldHandle = {
  render: (frame: GalaxyFrame) => void;
  resize: () => void;
};

type GalaxyFieldProps = {
  active: boolean;
  reducedMotion: boolean;
};

export const GalaxyField = forwardRef<GalaxyFieldHandle, GalaxyFieldProps>(
  function GalaxyField({ active, reducedMotion }, forwardedRef) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<GalaxyRenderer | null>(null);
    const latestFrameRef = useRef<GalaxyFrame>({
      corePresence: active ? 1 : 0,
      presence: active ? 1 : 0,
      travel: 0,
      velocity: 0,
    });

    useImperativeHandle(
      forwardedRef,
      () => ({
        render: (frame) => {
          latestFrameRef.current = frame;
          rendererRef.current?.render(frame);
        },
        resize: () => {
          rendererRef.current?.resize();
          rendererRef.current?.render(latestFrameRef.current);
        },
      }),
      [],
    );

    useEffect(() => {
      if (rendererRef.current) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const contextAttributes = {
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance" as const,
      };
      const context =
        canvas.getContext("webgl2", contextAttributes) ??
        canvas.getContext("webgl", contextAttributes);
      if (!context) {
        return;
      }

      let cancelled = false;
      void import("../galaxy-renderer").then(({ createGalaxyRenderer }) => {
        if (cancelled) {
          return;
        }
        const renderer = createGalaxyRenderer({
          canvas,
          context: context as WebGLRenderingContext | WebGL2RenderingContext,
          field: createGalaxyField({
            count: galaxyPointCountFor(window.innerWidth),
            seed: 80317,
          }),
          reducedMotion,
        });
        rendererRef.current = renderer;
        renderer.render(latestFrameRef.current);
      });

      return () => {
        cancelled = true;
      };
    }, [reducedMotion]);

    useEffect(
      () => () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
      },
      [],
    );

    return (
      <canvas
        aria-hidden="true"
        className="galaxy-field"
        data-active={active ? "true" : "false"}
        data-testid="galaxy-field"
        ref={canvasRef}
      />
    );
  },
);
