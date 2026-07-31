import {
  type CSSProperties,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

import {
  createRouteMarks,
  routeMarkerPosition,
  type StoryBeat,
} from "../story-navigation";

type RouteRailProps = {
  beats: readonly StoryBeat[];
  activeId: string;
  onSelect: (beat: StoryBeat) => void;
  initialProgress: number;
};

export type RouteRailHandle = {
  setProgress: (progress: number) => void;
};

export const RouteRail = forwardRef<RouteRailHandle, RouteRailProps>(
  function RouteRail(
    { beats, activeId, onSelect, initialProgress },
    forwardedRef,
  ) {
    const marks = createRouteMarks(beats);
    const rootRef = useRef<HTMLElement>(null);
    const markerPosition = routeMarkerPosition(initialProgress, marks.length);

    useImperativeHandle(
      forwardedRef,
      () => ({
        setProgress(progress) {
          rootRef.current?.style.setProperty(
            "--route-progress",
            `${routeMarkerPosition(progress, marks.length)}%`,
          );
        },
      }),
      [marks.length],
    );

    return (
      <nav
        aria-label="Story scrollbar"
        className="route-rail"
        ref={rootRef}
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
  },
);
