import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { projectBySlug } from "../content/site-content";
import { ArtifactPreview } from "./ArtifactPreview";

afterEach(cleanup);

describe("ArtifactPreview", () => {
  it("renders authentic imagery for image-backed projects", () => {
    const project = projectBySlug("monopole");
    if (!project) throw new Error("Missing Monopole project fixture");

    render(<ArtifactPreview project={project} />);

    expect(
      screen.getByRole("img", { name: /monopole evaluation dashboard/i }),
    ).toHaveAttribute("src", "/project-previews/monopole.png");
  });

  it("keeps the inline judge specimen as the sole generated preview", () => {
    const project = projectBySlug("llm-as-a-judge");
    if (!project) throw new Error("Missing LLM-as-a-Judge project fixture");

    const { container } = render(<ArtifactPreview project={project} />);

    expect(container.querySelector('[data-artifact="judge"]')).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
