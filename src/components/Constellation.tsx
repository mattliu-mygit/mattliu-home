import type { CSSProperties } from "react";

import type { Project } from "../projects";

type ConstellationProps = {
  project: Project;
  onSelect: (slug: string) => void;
};

export function Constellation({
  project,
  onSelect,
}: ConstellationProps) {
  return (
    <button
      className={`constellation constellation--${project.slug}`}
      style={
        {
          "--x": `${project.position.x}%`,
          "--y": `${project.position.y}%`,
        } as CSSProperties
      }
      type="button"
      aria-label={`Explore ${project.title}`}
      onClick={() => onSelect(project.slug)}
    >
      <svg viewBox="0 0 100 70" aria-hidden="true">
        {project.connections.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={project.stars[from][0]}
            y1={project.stars[from][1]}
            x2={project.stars[to][0]}
            y2={project.stars[to][1]}
          />
        ))}
        {project.stars.map(([x, y], index) => (
          <circle
            key={`${x}-${y}`}
            className={index === 0 ? "constellation__primary" : undefined}
            cx={x}
            cy={y}
            r={index === 0 ? 2.8 : 1.45}
          />
        ))}
      </svg>
      <span className="constellation__label">{project.title}</span>
      <span className="constellation__year" data-testid="project-year">
        {project.displayYear}
      </span>
    </button>
  );
}
