import {
  forwardRef,
  type CSSProperties,
  useImperativeHandle,
  useRef,
} from "react";

import type { Point2d } from "./celestial-motion";
import type { DestinationSlug, SiteContent } from "../content/site-content";
import type { UniverseView } from "../portfolio/navigation";
import {
  ConstellationMap,
  type ConstellationItem,
} from "./ConstellationMap";

type Destination = SiteContent["destinations"][number];

type ConstellationWorldProps = {
  activeSlugs: Partial<Record<DestinationSlug, string>>;
  destinations: readonly Destination[];
  interactive: boolean;
  items: Record<DestinationSlug, readonly ConstellationItem[]>;
  onEnter: (destination: DestinationSlug, itemSlug?: string) => void;
  onSelect: (destination: DestinationSlug, itemSlug: string) => void;
  onCameraSettled: () => void;
  view: UniverseView;
};

export type ConstellationWorldHandle = {
  setFocusOffset: (offset: Point2d) => void;
};

export const ConstellationWorld = forwardRef<
  ConstellationWorldHandle,
  ConstellationWorldProps
>(function ConstellationWorld(
  {
    activeSlugs,
    destinations,
    interactive,
    items,
    onCameraSettled,
    onEnter,
    onSelect,
    view,
  },
  forwardedRef,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(
    forwardedRef,
    () => ({
      setFocusOffset: (offset) => {
        rootRef.current?.style.setProperty("--focus-offset-x", `${offset.x}%`);
        rootRef.current?.style.setProperty("--focus-offset-y", `${offset.y}%`);
      },
    }),
    [],
  );

  return (
    <div
      aria-hidden={!interactive ? "true" : undefined}
      className="constellation-world"
      data-testid="constellation-world"
      inert={!interactive ? true : undefined}
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          (!event.propertyName || event.propertyName === "transform")
        ) {
          onCameraSettled();
        }
      }}
      ref={rootRef}
      style={
        {
          "--focus-offset-x": "0%",
          "--focus-offset-y": "0%",
        } as CSSProperties
      }
    >
      {destinations.map((destination) => {
        const mode =
          view === "universe"
            ? "overview"
            : view === destination.slug
              ? "detail"
              : "inactive";
        return (
          <ConstellationMap
            activeSlug={activeSlugs[destination.slug]}
            connections={destination.connections}
            getAccessibleName={(item) =>
              mode === "overview"
                ? `Open ${destination.label} with ${item.label} selected`
                : item.coda
                  ? `Explore ${item.label}`
                : destination.slug === "quotes"
                  ? `Read quote: ${item.label}`
                  : destination.slug === "path"
                    ? `Focus ${item.label}`
                    : `Explore ${item.label}`
            }
            items={items[destination.slug]}
            interactive={interactive}
            key={destination.slug}
            kind={destination.slug}
            label={destination.label}
            mode={mode}
            onOpen={() => onEnter(destination.slug)}
            onSelect={(itemSlug) => {
              if (mode === "overview") {
                onEnter(destination.slug, itemSlug);
              } else if (mode === "detail") {
                onSelect(destination.slug, itemSlug);
              }
            }}
            position={destination.position}
          />
        );
      })}
    </div>
  );
});
