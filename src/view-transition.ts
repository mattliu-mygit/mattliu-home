export type ViewTransitionHandle = {
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionHandle;
};

export function runViewTransition(
  targetDocument: Document,
  update: () => void,
  enabled: boolean,
): ViewTransitionHandle | null {
  const transitionDocument = targetDocument as ViewTransitionDocument;
  if (!enabled || !transitionDocument.startViewTransition) {
    update();
    return null;
  }
  return transitionDocument.startViewTransition(update);
}
