import type {
  DestinationSlug,
  SiteContent,
} from "../content/site-content";
import {
  ConstellationMap,
  type ConstellationItem,
} from "./ConstellationMap";

type Destination = SiteContent["destinations"][number];

type UniverseOverviewProps = {
  destinations: readonly Destination[];
  items: Record<DestinationSlug, readonly ConstellationItem[]>;
  onSelect: (destination: DestinationSlug, itemSlug?: string) => void;
};

export function UniverseOverview({
  destinations,
  items,
  onSelect,
}: UniverseOverviewProps) {
  return (
    <div className="universe-overview" aria-label="Universe">
      {destinations.map((destination) => (
        <ConstellationMap
          key={destination.slug}
          kind={destination.slug}
          variant="overview"
          items={items[destination.slug]}
          connections={destination.connections}
          label={destination.label}
          position={destination.position}
          getAccessibleName={(item) =>
            `Open ${destination.label} with ${item.label} selected`
          }
          onOpen={() => onSelect(destination.slug)}
          onSelect={(itemSlug) => onSelect(destination.slug, itemSlug)}
        />
      ))}
    </div>
  );
}
