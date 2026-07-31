import type { CSSProperties } from "react";

const shootingStars = [
  { start: [78, 8], end: [66, 22], delay: 2, duration: 23 },
  { start: [96, 34], end: [84, 47], delay: 11, duration: 29 },
  { start: [64, 72], end: [54, 84], delay: 17, duration: 31 },
  { start: [42, 6], end: [32, 17], delay: 7, duration: 27 },
  { start: [94, 78], end: [84, 90], delay: 19, duration: 37 },
] as const;

export function ShootingStars() {
  return (
    <svg
      className="shooting-stars"
      data-testid="shooting-stars"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {shootingStars.map((star, index) => (
        <line
          key={`${star.start.join("-")}-${star.end.join("-")}`}
          x1={star.start[0]}
          y1={star.start[1]}
          x2={star.end[0]}
          y2={star.end[1]}
          data-index={index}
          style={
            {
              "--shooting-delay": `${star.delay}s`,
              "--shooting-duration": `${star.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
}
