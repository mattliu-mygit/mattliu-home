import type { Project } from "../content/site-content";

type ArtifactPreviewProps = {
  project: Project;
};

export function ArtifactPreview({ project }: ArtifactPreviewProps) {
  if (project.artifact === "interface") {
    return (
      <div className="artifact artifact--interface" data-artifact="interface">
        <ArtifactLabel>Abstract evaluation workspace specimen</ArtifactLabel>
        <div className="evaluation-window">
          <div className="evaluation-window__bar">
            <i />
            <i />
            <i />
            <span>selected run · 24 calls</span>
          </div>
          {[
            ["Completion", "82%"],
            ["Correction-free", "61%"],
            ["Evidence quality", "77%"],
          ].map(([label, value]) => (
            <div className="evaluation-row" key={label}>
              <span>{label}</span>
              <b style={{ "--score": value } as React.CSSProperties} />
              <small>{value}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (project.artifact === "trace") {
    return (
      <div className="artifact artifact--trace" data-artifact="trace">
        <ArtifactLabel>Trace structure specimen</ArtifactLabel>
        <div className="trace-tree">
          <span>agent.run</span>
          <span>↳ tool.read</span>
          <span>↳ model.reason</span>
          <span className="trace-tree__accent">↳ tool.patch</span>
          <span>↳ evaluation.score</span>
        </div>
      </div>
    );
  }

  if (project.artifact === "ucredit") {
    return (
      <div className="artifact artifact--ucredit" data-artifact="ucredit">
        <ArtifactLabel>Abstract degree-planning specimen</ArtifactLabel>
        <div className="degree-plan">
          <div className="degree-plan__progress">
            <strong>68%</strong>
            <span>degree mapped</span>
          </div>
          <ol>
            <li>
              <i data-state="complete" />
              Core requirements
            </li>
            <li>
              <i data-state="active" />
              Major sequence
            </li>
            <li>
              <i />
              Elective space
            </li>
          </ol>
        </div>
      </div>
    );
  }

  if (project.artifact === "customization") {
    return (
      <div
        className="artifact artifact--customization"
        data-artifact="customization"
      >
        <ArtifactLabel>Abstract model-customization workflow</ArtifactLabel>
        <div className="customization-flow">
          {[
            ["01", "Define intent"],
            ["02", "Prepare data"],
            ["03", "Customize"],
            ["04", "Evaluate"],
            ["05", "Deploy"],
          ].map(([number, label], index) => (
            <div data-active={index === 3 ? "true" : undefined} key={number}>
              <small>{number}</small>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (project.artifact === "judge") {
    return (
      <div className="artifact artifact--judge" data-artifact="judge">
        <ArtifactLabel>Derived evaluator-context specimen</ArtifactLabel>
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

  return (
    <div className="artifact" data-artifact="unknown">
      <ArtifactLabel>Abstract project specimen</ArtifactLabel>
    </div>
  );
}

function ArtifactLabel({ children }: { children: React.ReactNode }) {
  return <p className="artifact__label">{children}</p>;
}
