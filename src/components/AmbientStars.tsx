const ambientStars = [
  [5, 12, 1],
  [12, 58, 0.6],
  [21, 19, 0.7],
  [29, 86, 0.5],
  [37, 27, 0.55],
  [48, 81, 0.6],
  [56, 15, 0.45],
  [63, 76, 0.7],
  [72, 9, 0.5],
  [79, 65, 0.55],
  [89, 42, 0.65],
  [95, 87, 0.45],
] as const;

export function AmbientStars() {
  return (
    <div className="ambient-stars" aria-hidden="true">
      {ambientStars.map(([x, y, opacity], index) => (
        <span
          key={`${x}-${y}`}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            opacity,
            animationDelay: `${(index % 4) * -1.1}s`,
          }}
        />
      ))}
    </div>
  );
}
