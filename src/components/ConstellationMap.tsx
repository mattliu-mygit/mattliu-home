import { type CSSProperties, useEffect, useRef } from "react";

import { projectConstellationPoint } from "../celestial-motion";
import type {
  Connection,
  DestinationSlug,
  Point,
} from "../content/site-content";

export type ConstellationItem = {
  slug: string;
  label: string;
  overviewLabel?: string;
  meta: string;
  position: Point;
  depth: number;
};

type ConstellationMapProps = {
  kind: DestinationSlug;
  variant?: "detail" | "overview";
  items: readonly ConstellationItem[];
  connections: readonly Connection[];
  activeSlug?: string;
  label?: string;
  position?: Point;
  getAccessibleName: (item: ConstellationItem) => string;
  onOpen?: (origin: Point) => void;
  onSelect: (slug: string, origin?: Point) => void;
};

export function ConstellationMap({
  kind,
  variant = "detail",
  items,
  connections,
  activeSlug,
  label,
  position,
  getAccessibleName,
  onOpen,
  onSelect,
}: ConstellationMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef(new Map<string, HTMLButtonElement>());
  const lineRefs = useRef(new Map<string, SVGLineElement>());

  useEffect(() => {
    const root = rootRef.current;
    if (variant !== "detail" || !root || !window.requestAnimationFrame) {
      return;
    }
    const universe = root.closest<HTMLElement>(".universe");
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      false;
    if (!universe || reducedMotion) {
      return;
    }

    let frameId = 0;
    const draw = () => {
      const pull = {
        x:
          Number.parseFloat(
            universe.style.getPropertyValue("--constellation-pull-x"),
          ) || 0,
        y:
          Number.parseFloat(
            universe.style.getPropertyValue("--constellation-pull-y"),
          ) || 0,
      };
      const viewport = { width: root.clientWidth, height: root.clientHeight };
      const projected = new Map<string, Point>();

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
        const line = lineRefs.current.get(`${from}-${to}`);
        const fromPosition = projected.get(from);
        const toPosition = projected.get(to);
        if (line && fromPosition && toPosition) {
          line.setAttribute("x1", String(fromPosition[0]));
          line.setAttribute("y1", String(fromPosition[1]));
          line.setAttribute("x2", String(toPosition[0]));
          line.setAttribute("y2", String(toPosition[1]));
        }
      }
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frameId);
  }, [connections, items, variant]);
  const getOrigin = (): Point => {
    const fallback = position ?? [50, 50];
    const root = rootRef.current;
    const overview = root?.closest<HTMLElement>(".universe-overview");
    if (!root || !overview) {
      return fallback;
    }

    const rootBox = root.getBoundingClientRect();
    const overviewBox = overview.getBoundingClientRect();
    if (overviewBox.width <= 0 || overviewBox.height <= 0) {
      return fallback;
    }

    return [
      ((rootBox.left + rootBox.width / 2 - overviewBox.left) /
        overviewBox.width) *
        100,
      ((rootBox.top + rootBox.height / 2 - overviewBox.top) /
        overviewBox.height) *
        100,
    ];
  };

  return (
    <div
      className={[
        "constellation-map",
        `constellation-map--${kind}`,
        `constellation-map--${variant}`,
        variant === "overview" ? "universe-constellation" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`${kind}-constellation-${variant}`}
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
              <line
                key={`${from}-${to}`}
                ref={(element) => {
                  const key = `${from}-${to}`;
                  if (element) {
                    lineRefs.current.set(key, element);
                  } else {
                    lineRefs.current.delete(key);
                  }
                }}
                x1={fromItem.position[0]}
                y1={fromItem.position[1]}
                x2={toItem.position[0]}
                y2={toItem.position[1]}
              />
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
              id={`constellation-star-${variant}-${kind}-${item.slug}`}
              key={item.slug}
              data-depth={item.depth}
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
                variant === "detail"
                  ? activeSlug === item.slug
                  : undefined
              }
              onClick={() =>
                onSelect(
                  item.slug,
                  variant === "overview" ? getOrigin() : undefined,
                )
              }
            >
              <span
                className="constellation-star__point"
                aria-hidden="true"
              />
              <span className="constellation-star__copy">
                <span className="constellation-star__label">
                  {displayLabel}
                </span>
                <span className="constellation-star__meta">{item.meta}</span>
              </span>
            </button>
          );
        })}
      </div>

      {variant === "overview" && label && onOpen ? (
        <button
          className="constellation-map__name"
          id={`universe-destination-${kind}`}
          type="button"
          aria-label={`Explore ${label}`}
          onClick={() => onOpen(getOrigin())}
        >
          {label}
        </button>
      ) : null}
    </div>
  );
}
