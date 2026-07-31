import { describe, expect, it } from "vitest";

import { projectBySlug, projects } from "./projects";

describe("project catalog", () => {
  it("contains only the five selected projects in narrative order", () => {
    expect(projects.map((project) => project.title)).toEqual([
      "UCredit",
      "Model Customization Assistant",
      "LLM-as-a-Judge",
      "Weave Agent Adapter",
      "Monopole",
    ]);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(
      projects.length,
    );
  });

  it("finds a project by its public fragment", () => {
    expect(projectBySlug("monopole")?.title).toBe("Monopole");
    expect(projectBySlug("missing")).toBeUndefined();
  });

  it("uses links only for projects with verified public material", () => {
    expect(projectBySlug("ucredit")?.repositoryUrl).toBe(
      "https://github.com/uCredit-Dev/ucredit_frontend_typescript",
    );
    expect(projectBySlug("model-customization-assistant")?.repositoryUrl).toBe(
      "https://aws.amazon.com/blogs/machine-learning/agent-guided-workflows-to-accelerate-model-customization-in-amazon-sagemaker-ai/",
    );
    expect(projectBySlug("llm-as-a-judge")?.repositoryUrl).toBeUndefined();
  });

  it("keeps current agent work at the end of the path", () => {
    expect(projects.slice(-2).map((project) => project.slug)).toEqual([
      "weave-agent-adapter",
      "monopole",
    ]);
  });
});
