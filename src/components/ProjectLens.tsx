import { useEffect, useRef } from "react";

import type { Project } from "../projects";
import { ArtifactPreview } from "./ArtifactPreview";

type ProjectLensProps = {
  project: Project;
  onClose: () => void;
};

export function ProjectLens({ project, onClose }: ProjectLensProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="project-lens"
      aria-label={project.title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <article className="project-lens__surface">
        <button
          className="project-lens__close"
          type="button"
          aria-label="Close project"
          onClick={onClose}
        >
          Close <span aria-hidden="true">×</span>
        </button>

        <div className="project-lens__copy">
          <p className="eyebrow">
            {project.displayYear} · selected work
          </p>
          <h2>{project.question}</h2>
          <p className="project-lens__description">{project.description}</p>
          <p className="project-lens__contribution">{project.contribution}</p>
          <ul className="technology-list" aria-label="Technologies">
            {project.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
          {project.repositoryUrl ? (
            <a className="project-lens__link" href={project.repositoryUrl}>
              {project.linkLabel ?? "View source"}{" "}
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>

        <ArtifactPreview project={project} />
      </article>
    </dialog>
  );
}
