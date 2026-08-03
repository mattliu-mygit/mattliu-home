import { type CSSProperties, useLayoutEffect, useRef } from "react";

import { useCelestialMotionChannel } from "./celestial-motion-channel";
import { projectConstellationPoint } from "./celestial-motion";
import type {
  Connection,
  DestinationSlug,
  Point,
  StarProminence,
  StarTone,
} from "../content/site-content";

export type ConstellationItem = {
  slug: string;
  label: string;
  overviewLabel?: string;
  meta?: string;
  coda?: boolean;
  position: Point;
  depth: number;
  tone: StarTone;
  prominence: StarProminence;
};

type ConstellationMapProps = {
  kind: DestinationSlug;
  mode?: "detail" | "overview" | "inactive";
  items: readonly ConstellationItem[];
  connections: readonly Connection[];
  activeSlug?: string;
  interactive?: boolean;
  label?: string;
  position?: Point;
  getAccessibleName: (item: ConstellationItem) => string;
  onOpen?: () => void;
  onSelect: (slug: string) => void;
};

export function ConstellationMap({
  kind,
  mode = "detail",
  items,
  connections,
  activeSlug,
  interactive = true,
  label,
  position,
  getAccessibleName,
  onOpen,
  onSelect,
}: ConstellationMapProps) {
  const variant = mode === "detail" ? "detail" : "overview";
  const rootRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef(new Map<string, HTMLButtonElement>());
  const connectionRefs = useRef(new Map<string, SVGGElement>());
  const motionChannel = useCelestialMotionChannel();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (mode !== "detail" || !root || !motionChannel) {
      return;
    }

    const viewport = { width: root.clientWidth, height: root.clientHeight };
    const projected = new Map<string, Point>();
    const draw = (pull: { x: number; y: number }) => {
      projected.clear();

      for (const item of items) {
        const position = projectConstellationPoint(
          item.position,
          item.depth,
          pull,
          viewport,
        );
        projected.set(item.slug, position);
        const star = starRefs.current.get(item.slug);
        star?.style.setProperty("--star-x", `${position[0]}%`);
        star?.style.setProperty("--star-y", `${position[1]}%`);
      }

      for (const [from, to] of connections) {
        const connection = connectionRefs.current.get(`${from}-${to}`);
        const fromPosition = projected.get(from);
        const toPosition = projected.get(to);
        if (connection && fromPosition && toPosition) {
          for (const line of connection.querySelectorAll("line")) {
            line.setAttribute("x1", String(fromPosition[0]));
            line.setAttribute("y1", String(fromPosition[1]));
            line.setAttribute("x2", String(toPosition[0]));
            line.setAttribute("y2", String(toPosition[1]));
          }
        }
      }
    };

    const unsubscribe = motionChannel.subscribe(draw);
    const resizeObserver = window.ResizeObserver
      ? new ResizeObserver(() => {
          viewport.width = root.clientWidth;
          viewport.height = root.clientHeight;
          draw(motionChannel.current());
        })
      : null;
    resizeObserver?.observe(root);

    return () => {
      resizeObserver?.disconnect();
      unsubscribe();
    };
  }, [connections, items, mode, motionChannel]);
  return (
    <div
      className={[
        "constellation-map",
        `constellation-map--${kind}`,
        `constellation-map--${variant}`,
        `constellation-map--${mode}`,
        mode === "overview" ? "universe-constellation" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`${kind}-constellation`}
      aria-hidden={mode === "inactive" ? "true" : undefined}
      ref={rootRef}
      style={
        position
          ? ({
              "--destination-x": `${position[0]}%`,
              "--destination-y": `${position[1]}%`,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="constellation-map__plane">
        <svg
          className="constellation-map__connections"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {connections.map(([from, to]) => {
            const fromItem = items.find((item) => item.slug === from);
            const toItem = items.find((item) => item.slug === to);
            return fromItem && toItem ? (
              <g
                className="constellation-connection"
                key={`${from}-${to}`}
                ref={(element) => {
                  const key = `${from}-${to}`;
                  if (element) {
                    connectionRefs.current.set(key, element);
                  } else {
                    connectionRefs.current.delete(key);
                  }
                }}
              >
                <line
                  className="constellation-connection__hit"
                  x1={fromItem.position[0]}
                  y1={fromItem.position[1]}
                  x2={toItem.position[0]}
                  y2={toItem.position[1]}
                />
                <line
                  className="constellation-connection__line"
                  x1={fromItem.position[0]}
                  y1={fromItem.position[1]}
                  x2={toItem.position[0]}
                  y2={toItem.position[1]}
                />
              </g>
            ) : null;
          })}
        </svg>

        {items.map((item, index) => {
          const displayLabel =
            variant === "overview"
              ? (item.overviewLabel ?? item.label)
              : item.label;
          return (
            <button
              className="constellation-star"
              data-active={activeSlug === item.slug ? "true" : undefined}
              data-index={index}
              id={`constellation-star-${kind}-${item.slug}`}
              key={item.slug}
              data-tone={item.tone}
              data-prominence={item.prominence}
              ref={(element) => {
                if (element) {
                  starRefs.current.set(item.slug, element);
                } else {
                  starRefs.current.delete(item.slug);
                }
              }}
              style={
                {
                  "--star-x": `${item.position[0]}%`,
                  "--star-y": `${item.position[1]}%`,
                } as CSSProperties
              }
              type="button"
              aria-label={getAccessibleName(item)}
              aria-pressed={
                mode === "detail"
                  ? activeSlug === item.slug
                  : undefined
              }
              aria-disabled={!interactive ? "true" : undefined}
              onClick={() => {
                if (interactive) {
                  onSelect(item.slug);
                }
              }}
              tabIndex={mode === "inactive" || !interactive ? -1 : 0}
            >
              <span
                className="constellation-star__point"
                aria-hidden="true"
              />
              <span className="constellation-star__copy">
                <span className="constellation-star__label">
                  {displayLabel}
                </span>
                {item.meta ? (
                  <span className="constellation-star__meta">{item.meta}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "overview" && label && onOpen ? (
        <button
          className="constellation-map__name"
          id={`universe-destination-${kind}`}
          type="button"
          aria-label={`Explore ${label}`}
          aria-disabled={!interactive ? "true" : undefined}
          onClick={() => {
            if (interactive) {
              onOpen();
            }
          }}
          tabIndex={!interactive ? -1 : 0}
        >
          {label}
        </button>
      ) : null}
    </div>
  );
}
