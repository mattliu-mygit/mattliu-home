import { useEffect, useState } from "react";

const readProgress = () => {
  const scrollRange = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1,
  );
  return Math.min(1, Math.max(0, window.scrollY / scrollRange));
};

export function useScrollProgress() {
  const [progress, setProgress] = useState(readProgress);

  useEffect(() => {
    let frame: number | null = null;

    const update = () => {
      if (frame !== null) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setProgress(readProgress());
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return progress;
}
