import type { CSSProperties } from "react";

import {
  createRouteMarks,
  routeMarkerPosition,
  type StoryBeat,
} from "../story-navigation";

type RouteRailProps = {
  beats: readonly StoryBeat[];
  activeId: string;
  onSelect: (beat: StoryBeat) => void;
  progress: number;
};

export function RouteRail({
  beats,
  activeId,
  onSelect,
  progress,
}: RouteRailProps) {
  const marks = createRouteMarks(beats);
  const markerPosition = routeMarkerPosition(progress, marks.length);
  return (
    <nav
      aria-label="Story scrollbar"
      className="route-rail"
      style={{ "--route-progress": `${markerPosition}%` } as CSSProperties}
    >
      <span aria-hidden="true" className="route-rail__position" />
      <ol>
        {marks.map((mark) => {
          const active = mark.id === activeId;
          return (
            <li key={mark.id}>
              <button
                aria-current={active ? "step" : undefined}
                aria-label={mark.accessibleLabel}
                data-active={active ? "true" : undefined}
                data-major={mark.major ? "true" : undefined}
                onClick={() => onSelect(mark.beat)}
                type="button"
              >
                <span aria-hidden="true" className="route-rail__tick" />
                <span className="route-rail__label">{mark.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
