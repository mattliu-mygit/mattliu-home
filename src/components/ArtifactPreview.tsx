import type { Project } from "../projects";

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

  if (project.artifact === "diff") {
    return (
      <div className="artifact artifact--diff" data-artifact="diff">
        <ArtifactLabel>Before-and-after output specimen</ArtifactLabel>
        <div className="diff">
          <div>
            <small>before</small>
            <code>- outcome = run(task)</code>
            <code>- save(outcome)</code>
          </div>
          <div>
            <small>after</small>
            <code>+ outcome = inspect(run(task))</code>
            <code>+ save(outcome, evidence)</code>
          </div>
        </div>
      </div>
    );
  }

  if (project.artifact === "pixel") {
    return (
      <div className="artifact artifact--pixel" data-artifact="pixel">
        <ArtifactLabel>Repository artwork–inspired specimen</ArtifactLabel>
        <div className="pixel-scene" aria-hidden="true">
          <i className="pixel-scene__moon" />
          <i className="pixel-scene__player" />
          <i className="pixel-scene__beam" />
          <i className="pixel-scene__ground" />
        </div>
      </div>
    );
  }

  return (
    <div className="artifact artifact--space" data-artifact="space">
      <ArtifactLabel>Repository artwork–inspired specimen</ArtifactLabel>
      <div className="space-scene" aria-hidden="true">
        <i className="space-scene__orbit" />
        <i className="space-scene__planet" />
        <i className="space-scene__ship">▲</i>
      </div>
    </div>
  );
}

function ArtifactLabel({ children }: { children: React.ReactNode }) {
  return <p className="artifact__label">{children}</p>;
}
