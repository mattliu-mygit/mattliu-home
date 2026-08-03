export type NarrativeWheelInput = {
  deltaY: number;
  deltaMode: number;
};

export type NarrativeScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

const LINE_HEIGHT_PX = 16;
export const MAX_NARRATIVE_DELTA_PX = 120;

export function normalizeNarrativeWheel(
  input: NarrativeWheelInput,
  viewportHeight: number,
): number {
  const unit =
    input.deltaMode === 1
      ? LINE_HEIGHT_PX
      : input.deltaMode === 2
        ? viewportHeight
        : 1;
  const pixels = input.deltaY * unit;
  return Math.max(
    -MAX_NARRATIVE_DELTA_PX,
    Math.min(MAX_NARRATIVE_DELTA_PX, pixels),
  );
}

export function canScrollNarrative(
  metrics: NarrativeScrollMetrics,
  deltaY: number,
): boolean {
  if (deltaY === 0) {
    return false;
  }
  const maxScrollTop = Math.max(
    0,
    metrics.scrollHeight - metrics.clientHeight,
  );
  return deltaY < 0
    ? metrics.scrollTop > 0
    : metrics.scrollTop < maxScrollTop;
}
