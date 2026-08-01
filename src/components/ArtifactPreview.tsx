import type { Project } from "../content/site-content";

type ArtifactPreviewProps = {
  project: Project;
};

export function ArtifactPreview({ project }: ArtifactPreviewProps) {
  if (project.previewImage && project.previewAlt) {
    return (
      <figure className="artifact artifact--image" data-artifact="image">
        <img
          alt={project.previewAlt}
          decoding="async"
          loading="lazy"
          src={project.previewImage}
        />
      </figure>
    );
  }

  return (
    <div className="artifact artifact--judge" data-artifact="judge">
      <p className="artifact__label">Derived evaluator-context specimen</p>
      <div className="judge-context">
        <div>
          <small>digest · before</small>
          <span>Planning and evidence gathered</span>
        </div>
        <div className="judge-context__raw">
          <small>raw window</small>
          <span>tool.read → model.reason → tool.patch</span>
        </div>
        <div>
          <small>digest · after</small>
          <span>Verification and outcome recorded</span>
        </div>
        <p>
          <span>Verdict</span>
          Evidence supports the score
        </p>
      </div>
    </div>
  );
}
