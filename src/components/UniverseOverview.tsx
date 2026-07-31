import type { CSSProperties } from "react";

import type {
  DestinationSlug,
  Point,
} from "../content/site-content";

type Destination = {
  slug: DestinationSlug;
  label: string;
  position: Point;
};

type UniverseOverviewProps = {
  destinations: readonly Destination[];
  onSelect: (slug: DestinationSlug) => void;
};

const patterns: Record<DestinationSlug, readonly Point[]> = {
  projects: [
    [8, 66],
    [28, 24],
    [50, 61],
    [73, 27],
    [93, 9],
  ],
  quotes: [
    [8, 54],
    [24, 22],
    [39, 67],
    [55, 36],
    [70, 72],
    [84, 42],
    [95, 14],
  ],
};

export function UniverseOverview({
  destinations,
  onSelect,
}: UniverseOverviewProps) {
  return (
    <div className="universe-overview" aria-label="Universe">
      {destinations.map((destination) => {
        const points = patterns[destination.slug];
        return (
          <button
            className="universe-destination"
            id={`universe-destination-${destination.slug}`}
            key={destination.slug}
            type="button"
            aria-label={`Explore ${destination.label}`}
            style={
              {
                "--destination-x": `${destination.position[0]}%`,
                "--destination-y": `${destination.position[1]}%`,
              } as CSSProperties
            }
            onClick={() => onSelect(destination.slug)}
          >
            <svg
              className="universe-destination__glyph"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <polyline
                points={points.map((point) => point.join(",")).join(" ")}
              />
              {points.map(([x, y]) => (
                <circle cx={x} cy={y} key={`${x}-${y}`} r="2.3" />
              ))}
            </svg>
            <span>{destination.label}</span>
          </button>
        );
      })}
    </div>
  );
}
