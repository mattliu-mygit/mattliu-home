export type ViewTransitionHandle = {
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionHandle;
};

const activeTransition = new WeakMap<Document, object>();

export function runViewTransition(
  targetDocument: Document,
  update: () => void,
  enabled: boolean,
  target?: string,
): ViewTransitionHandle | null {
  const transitionDocument = targetDocument as ViewTransitionDocument;
  if (!enabled || !transitionDocument.startViewTransition) {
    update();
    return null;
  }

  const root = targetDocument.documentElement;
  const transitionToken = {};
  activeTransition.set(targetDocument, transitionToken);
  const cleanupTarget = () => {
    if (activeTransition.get(targetDocument) !== transitionToken) {
      return;
    }
    activeTransition.delete(targetDocument);
    delete root.dataset.viewTransitionTarget;
  };
  if (target) {
    root.dataset.viewTransitionTarget = target;
  } else {
    delete root.dataset.viewTransitionTarget;
  }

  try {
    const transition = transitionDocument.startViewTransition(update);
    void transition.finished.then(cleanupTarget, cleanupTarget);
    return transition;
  } catch (error) {
    cleanupTarget();
    throw error;
  }
}
