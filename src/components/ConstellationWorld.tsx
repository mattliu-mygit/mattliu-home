import type {
  DestinationSlug,
  Point,
  SiteContent,
} from "../content/site-content";
import type { UniverseView } from "../navigation";
import {
  ConstellationMap,
  type ConstellationItem,
} from "./ConstellationMap";

type Destination = SiteContent["destinations"][number];

type ConstellationWorldProps = {
  activeSlugs: Partial<Record<DestinationSlug, string>>;
  destinations: readonly Destination[];
  items: Record<DestinationSlug, readonly ConstellationItem[]>;
  onEnter: (
    destination: DestinationSlug,
    itemSlug?: string,
    origin?: Point,
  ) => void;
  onSelect: (destination: DestinationSlug, itemSlug: string) => void;
  view: UniverseView;
};

export function ConstellationWorld({
  activeSlugs,
  destinations,
  items,
  onEnter,
  onSelect,
  view,
}: ConstellationWorldProps) {
  return (
    <div className="constellation-world" data-testid="constellation-world">
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
                : destination.slug === "quotes"
                  ? `Read quote: ${item.label}`
                  : destination.slug === "path"
                    ? `Focus ${item.label}`
                    : `Explore ${item.label}`
            }
            items={items[destination.slug]}
            key={destination.slug}
            kind={destination.slug}
            label={destination.label}
            mode={mode}
            onOpen={(origin) => onEnter(destination.slug, undefined, origin)}
            onSelect={(itemSlug, origin) => {
              if (mode === "overview") {
                onEnter(destination.slug, itemSlug, origin);
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
}
