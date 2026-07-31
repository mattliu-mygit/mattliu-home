import type { CSSProperties } from "react";

import type { Point } from "../projects";

type ConstellationItem = {
  slug: string;
  label: string;
  meta: string;
  position: Point;
};

type ConstellationMapProps = {
  kind: "projects" | "quotes";
  items: readonly ConstellationItem[];
  connections: readonly (readonly [from: number, to: number])[];
  activeSlug?: string;
  getAccessibleName: (item: ConstellationItem) => string;
  onSelect: (slug: string) => void;
};

export function ConstellationMap({
  kind,
  items,
  connections,
  activeSlug,
  getAccessibleName,
  onSelect,
}: ConstellationMapProps) {
  return (
    <div
      className={`constellation-map constellation-map--${kind}`}
      data-testid={`${kind}-constellation`}
    >
      <div className="constellation-map__plane">
        <svg
          className="constellation-map__connections"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {connections.map(([from, to]) => (
            <line
              key={`${from}-${to}`}
              x1={items[from].position[0]}
              y1={items[from].position[1]}
              x2={items[to].position[0]}
              y2={items[to].position[1]}
            />
          ))}
        </svg>

        {items.map((item, index) => (
          <button
            className="constellation-star"
            data-active={activeSlug === item.slug ? "true" : undefined}
            data-index={index}
            key={item.slug}
            style={
              {
                "--star-x": `${item.position[0]}%`,
                "--star-y": `${item.position[1]}%`,
              } as CSSProperties
            }
            type="button"
            aria-label={getAccessibleName(item)}
            onClick={() => onSelect(item.slug)}
          >
            <span className="constellation-star__point" aria-hidden="true" />
            <span className="constellation-star__copy">
              <span className="constellation-star__label">{item.label}</span>
              <span className="constellation-star__meta">{item.meta}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
