import { useEffect, useRef } from "react";

import { centeredStoryBeat, type StoryBeat } from "../story-navigation";
import { ArtifactPreview } from "./ArtifactPreview";

export type StoryScrollRequest = {
  id: string;
  key: number;
  behavior?: ScrollBehavior;
};

type StoryDrawerProps = {
  beats: readonly StoryBeat[];
  activeId: string;
  collapsed: boolean;
  scrollRequest: StoryScrollRequest | null;
  onActiveBeat: (beat: StoryBeat) => void;
  onActivate: (beat: StoryBeat) => void;
  onCollapsedChange: (collapsed: boolean) => void;
};

export function StoryDrawer({
  beats,
  activeId,
  collapsed,
  scrollRequest,
  onActiveBeat,
  onActivate,
  onCollapsedChange,
}: StoryDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(activeId);
  const requestedIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  useEffect(() => {
    if (!scrollRequest || collapsed) {
      return;
    }
    requestedIdRef.current = scrollRequest.id;
    const target = Array.from(
      scrollRef.current?.querySelectorAll<HTMLElement>("[data-story-beat]") ??
        [],
    ).find((element) => element.dataset.storyBeat === scrollRequest.id);
    target?.scrollIntoView?.({
      block: "center",
      behavior: scrollRequest.behavior ?? "smooth",
    });
  }, [collapsed, scrollRequest]);

  const handleScroll = () => {
    const scroll = scrollRef.current;
    if (!scroll) {
      return;
    }
    const scrollBox = scroll.getBoundingClientRect();
    const id = centeredStoryBeat(
      Array.from(
        scroll.querySelectorAll<HTMLElement>("[data-story-beat]"),
      ).map((element) => {
        const box = element.getBoundingClientRect();
        return {
          id: element.dataset.storyBeat ?? "",
          center: box.top + box.height / 2,
        };
      }),
      scrollBox.top + scrollBox.height / 2,
    );
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
      className="story-drawer"
      data-active-beat={activeId}
      data-collapsed={collapsed ? "true" : undefined}
      role="region"
    >
      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Show story" : "Hide story"}
        className="story-drawer__toggle"
        onClick={() => onCollapsedChange(!collapsed)}
        type="button"
      >
        <span aria-hidden="true">{collapsed ? "→" : "←"}</span>
      </button>

      <div
        aria-label="Story sequence"
        aria-hidden={collapsed ? "true" : undefined}
        className="story-drawer__scroll"
        data-story-scroll
        onPointerDown={() => {
          requestedIdRef.current = null;
        }}
        onScroll={handleScroll}
        onWheel={() => {
          requestedIdRef.current = null;
        }}
        ref={scrollRef}
        tabIndex={collapsed ? -1 : 0}
      >
        <ol className="story-drawer__sequence">
          {beats.map((beat) => (
            <li
              className="story-drawer__beat"
              data-active={beat.id === activeId ? "true" : undefined}
              data-story-beat={beat.id}
              key={beat.id}
            >
              <StoryCard
                beat={beat}
                disabled={collapsed}
                onActivate={onActivate}
              />
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

function StoryCard({
  beat,
  disabled,
  onActivate,
}: {
  beat: StoryBeat;
  disabled: boolean;
  onActivate: (beat: StoryBeat) => void;
}) {
  if (beat.kind === "intro") {
    return (
      <div className="story-card story-card--intro">
        <span className="sr-only">Universe overview</span>
      </div>
    );
  }

  if (beat.kind === "destination") {
    return (
      <button
        aria-label={`Open ${beat.view} constellation`}
        className="story-card story-card--destination"
        onClick={() => onActivate(beat)}
        tabIndex={disabled ? -1 : 0}
        type="button"
      >
        <span>{beat.view}</span>
      </button>
    );
  }

  if (beat.kind === "project") {
    return (
      <article className="story-card story-card--project">
        <button
          aria-label={`Open ${beat.project.title}`}
          className="story-card__project-action"
          onClick={() => onActivate(beat)}
          tabIndex={disabled ? -1 : 0}
          type="button"
        />
        <ArtifactPreview project={beat.project} />
        <span className="story-card__copy">
          <span className="story-card__meta">
            <span>{beat.project.displayYear}</span>
            <span>{beat.project.contribution}</span>
          </span>
          <strong>{beat.project.title}</strong>
          <span className="story-card__question">{beat.project.question}</span>
        </span>
      </article>
    );
  }

  return (
    <article className="story-card story-card--quote">
      <button
        aria-label={`Select quote: ${beat.quote.text}`}
        className="story-card__quote-action"
        onClick={() => onActivate(beat)}
        tabIndex={disabled ? -1 : 0}
        type="button"
      >
        <blockquote>{beat.quote.text}</blockquote>
      </button>
      <a href={beat.quote.sourceUrl} tabIndex={disabled ? -1 : 0}>
        {beat.quote.author} <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
