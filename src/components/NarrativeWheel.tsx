import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import {
  centeredStoryBeat,
  constellationTravelAtProgress,
  interpolatedStoryProgress,
  type ConstellationTravel,
  type StoryBeat,
} from "../story-navigation";
import {
  canScrollNarrative,
  normalizeNarrativeWheel,
  type NarrativeWheelInput,
} from "../wheel-input";
import { ArtifactPreview } from "./ArtifactPreview";
import { ExternalLink } from "./ExternalLink";

export type NarrativeWheelHandle = {
  scrollBy: (input: NarrativeWheelInput) => boolean;
  scrollToBeat: (id: string, behavior?: ScrollBehavior) => void;
};

type NarrativeWheelProps = {
  beats: readonly StoryBeat[];
  activeId: string;
  onActiveBeat: (beat: StoryBeat) => void;
  onActivate: (beat: StoryBeat) => void;
  onProgressChange: (
    progress: number,
    travel: ConstellationTravel | null,
  ) => void;
};

export const NarrativeWheel = forwardRef<
  NarrativeWheelHandle,
  NarrativeWheelProps
>(function NarrativeWheel(
  {
    beats,
    activeId,
    onActiveBeat,
    onActivate,
    onProgressChange,
  },
  forwardedRef,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(activeId);
  const requestedIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const scrollToBeat = useCallback(
    (id: string, behavior: ScrollBehavior = "smooth") => {
      requestedIdRef.current = id;
      const target = Array.from(
        scrollRef.current?.querySelectorAll<HTMLElement>("[data-story-beat]") ??
          [],
      ).find((element) => element.dataset.storyBeat === id);
      target?.scrollIntoView?.({ block: "center", behavior });
    },
    [],
  );

  const applyWheelInput = useCallback((input: NarrativeWheelInput) => {
    requestedIdRef.current = null;
    const scroll = scrollRef.current;
    if (!scroll) {
      return false;
    }
    const deltaY = normalizeNarrativeWheel(input, scroll.clientHeight);
    if (!canScrollNarrative(scroll, deltaY)) {
      return false;
    }
    scroll.scrollBy({ top: deltaY, behavior: "auto" });
    return true;
  }, []);

  useImperativeHandle(
    forwardedRef,
    () => ({
      scrollBy: applyWheelInput,
      scrollToBeat,
    }),
    [applyWheelInput, scrollToBeat],
  );

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        return;
      }
      event.preventDefault();
      applyWheelInput({
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
      });
    };
    scroll.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroll.removeEventListener("wheel", handleWheel);
  }, [applyWheelInput]);

  const handleScroll = () => {
    const scroll = scrollRef.current;
    if (!scroll) {
      return;
    }
    const scrollBox = scroll.getBoundingClientRect();
    const entries = Array.from(
      scroll.querySelectorAll<HTMLElement>("[data-story-beat]"),
    ).map(
        (element) => {
          const box = element.getBoundingClientRect();
          return {
            id: element.dataset.storyBeat ?? "",
            center: box.top + box.height / 2,
          };
        },
      );
    const viewportCenter = scrollBox.top + scrollBox.height / 2;
    const progress = interpolatedStoryProgress(entries, viewportCenter);
    onProgressChange(
      progress,
      constellationTravelAtProgress(beats, progress),
    );
    const id = centeredStoryBeat(entries, viewportCenter);
    if (!id || id === activeIdRef.current) {
      if (id === requestedIdRef.current) {
        requestedIdRef.current = null;
      }
      return;
    }
    if (requestedIdRef.current && id !== requestedIdRef.current) {
      return;
    }
    requestedIdRef.current = null;
    const beat = beats.find((candidate) => candidate.id === id);
    if (beat) {
      onActiveBeat(beat);
    }
  };

  return (
    <aside
      aria-label="Portfolio story"
      className="narrative-wheel"
      data-active-beat={activeId}
      role="region"
    >
      <div
        aria-label="Story sequence"
        className="narrative-wheel__scroll"
        data-story-scroll
        onPointerDown={() => {
          requestedIdRef.current = null;
        }}
        onScroll={handleScroll}
        ref={scrollRef}
        tabIndex={0}
      >
        <ol className="narrative-wheel__sequence">
          {beats.map((beat) => (
            <li
              className="narrative-wheel__beat"
              data-active={beat.id === activeId ? "true" : undefined}
              data-story-beat={beat.id}
              key={beat.id}
            >
              <NarrativeCard
                beat={beat}
                onActivate={onActivate}
              />
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
});

function NarrativeCard({
  beat,
  onActivate,
}: {
  beat: StoryBeat;
  onActivate: (beat: StoryBeat) => void;
}) {
  if (beat.kind === "intro") {
    if (beat.line === "name") {
      return (
        <div className="narrative-card narrative-card--intro narrative-card--name">
          <p>{beat.kicker}</p>
          <span className="narrative-card__portrait">
            <img
              alt="Matthew Liu"
              decoding="async"
              src="/matthew-liu.png"
            />
          </span>
          <h1>{beat.content}</h1>
        </div>
      );
    }
    if (beat.line === "headline") {
      return (
        <div className="narrative-card narrative-card--intro narrative-card--headline">
          <EmphasizedFinalWord>{beat.content}</EmphasizedFinalWord>
        </div>
      );
    }
    return (
      <div className="narrative-card narrative-card--intro narrative-card--context">
        <p>{beat.content}</p>
        <span aria-hidden="true">Continue along the route ↓</span>
      </div>
    );
  }

  if (beat.kind === "destination") {
    return (
      <button
        aria-label={`Open ${beat.view} constellation`}
        className="narrative-card narrative-card--destination"
        onClick={() => onActivate(beat)}
        type="button"
      >
        <span>{beat.view}</span>
      </button>
    );
  }

  if (beat.kind === "path") {
    return (
      <article className="narrative-card narrative-card--path">
        <button
          aria-label={`Focus ${beat.entry.organization}`}
          className="narrative-card__action"
          onClick={() => onActivate(beat)}
          type="button"
        />
        <span className="narrative-card__eyebrow">{beat.entry.area}</span>
        <h2>{beat.entry.organization}</h2>
        <p>{beat.entry.summary}</p>
      </article>
    );
  }

  if (beat.kind === "coda") {
    return <CodaCard beat={beat} onActivate={onActivate} />;
  }

  if (beat.kind === "project") {
    return (
      <article className="narrative-card narrative-card--project">
        <button
          aria-label={`Open ${beat.project.title}`}
          className="narrative-card__action"
          onClick={() => onActivate(beat)}
          type="button"
        />
        <ArtifactPreview project={beat.project} />
        <span className="narrative-card__copy">
          <span className="narrative-card__meta">
            <span>{beat.project.displayYear}</span>
            <span>{beat.project.contribution}</span>
          </span>
          <strong>{beat.project.title}</strong>
          <span className="narrative-card__question">{beat.project.question}</span>
        </span>
      </article>
    );
  }

  return (
    <article className="narrative-card narrative-card--quote">
      <button
        aria-label={`Select quote: ${beat.quote.text}`}
        className="narrative-card__quote-action"
        onClick={() => onActivate(beat)}
        type="button"
      >
        <blockquote>{beat.quote.text}</blockquote>
      </button>
      <ExternalLink
        href={beat.quote.sourceUrl}
      >
        {beat.quote.author} <span aria-hidden="true">↗</span>
      </ExternalLink>
    </article>
  );
}

function CodaCard({
  beat,
  onActivate,
}: {
  beat: Extract<StoryBeat, { kind: "coda" }>;
  onActivate: (beat: StoryBeat) => void;
}) {
  const action = (
    <button
      aria-label={`Focus ${beat.coda.text}`}
      className="narrative-card__action"
      onClick={() => onActivate(beat)}
      type="button"
    />
  );

  if (beat.view === "path") {
    return (
      <article className="narrative-card narrative-card--path narrative-card--coda">
        {action}
        <span className="narrative-card__eyebrow">
          {beat.coda.shortLabel}
        </span>
        <h2>{beat.coda.text}</h2>
      </article>
    );
  }

  if (beat.view === "projects") {
    return (
      <article className="narrative-card narrative-card--project narrative-card--coda narrative-card--coda-project">
        {action}
        <span className="narrative-card__copy">
          <span className="narrative-card__meta">
            <span>{beat.coda.shortLabel}</span>
          </span>
          <strong>{beat.coda.text}</strong>
        </span>
      </article>
    );
  }

  return (
    <article className="narrative-card narrative-card--quote narrative-card--coda">
      <button
        aria-label={`Focus ${beat.coda.text}`}
        className="narrative-card__quote-action"
        onClick={() => onActivate(beat)}
        type="button"
      >
        <blockquote>{beat.coda.text}</blockquote>
      </button>
      <span className="narrative-card__coda-meta">
        {beat.coda.shortLabel}
      </span>
    </article>
  );
}

function EmphasizedFinalWord({ children }: { children: string }) {
  const finalSpace = children.lastIndexOf(" ");
  if (finalSpace < 0) {
    return <p>{children}</p>;
  }
  return (
    <p>
      {children.slice(0, finalSpace + 1)}
      <em>{children.slice(finalSpace + 1)}</em>
    </p>
  );
}
