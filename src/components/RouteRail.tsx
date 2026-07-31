import {
  createRouteMarks,
  type StoryBeat,
} from "../story-navigation";

type RouteRailProps = {
  beats: readonly StoryBeat[];
  activeId: string;
  onSelect: (beat: StoryBeat) => void;
};

export function RouteRail({ beats, activeId, onSelect }: RouteRailProps) {
  const marks = createRouteMarks(beats);
  const activeIndex = Math.max(
    0,
    marks.findIndex((mark) => mark.id === activeId),
  );
  const progress = marks.length > 1 ? (activeIndex / (marks.length - 1)) * 100 : 0;
  return (
    <nav
      aria-label="Story scrollbar"
      className="route-rail"
      style={{ "--route-progress": `${progress}%` } as CSSProperties}
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
import type { CSSProperties } from "react";
