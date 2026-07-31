export type Point = readonly [x: number, y: number];

export type Project = {
  slug: string;
  title: string;
  year: number;
  displayYear: string;
  question: string;
  description: string;
  contribution: string;
  technologies: readonly string[];
  repositoryUrl?: string;
  linkLabel?: string;
  artifact: "ucredit" | "customization" | "judge" | "trace" | "interface";
  position: Point;
};

export const projects: readonly Project[] = [
  {
    slug: "ucredit",
    title: "UCredit",
    year: 2021,
    displayYear: "2021",
    question: "Can degree planning feel less uncertain?",
    description:
      "A collaborative advising dashboard built on uCredit to help students and advisors reason about academic plans.",
    contribution: "Frontend engineering and product development",
    technologies: ["React", "TypeScript", "Product engineering"],
    repositoryUrl:
      "https://github.com/uCredit-Dev/ucredit_frontend_typescript",
    linkLabel: "View project",
    artifact: "ucredit",
    position: [13, 72],
  },
  {
    slug: "model-customization-assistant",
    title: "Model Customization Assistant",
    year: 2025,
    displayYear: "2025–26",
    question: "Can model training begin with intent, not infrastructure?",
    description:
      "An agent-guided SageMaker workflow that turns a use case into data preparation, fine-tuning, evaluation, and deployment steps.",
    contribution: "Agent workflow and product engineering",
    technologies: ["SageMaker AI", "Agent skills", "Model evaluation"],
    repositoryUrl:
      "https://aws.amazon.com/blogs/machine-learning/agent-guided-workflows-to-accelerate-model-customization-in-amazon-sagemaker-ai/",
    linkLabel: "Read the launch",
    artifact: "customization",
    position: [31, 43],
  },
  {
    slug: "llm-as-a-judge",
    title: "LLM-as-a-Judge",
    year: 2025,
    displayYear: "2025",
    question: "How should a model judge work it cannot see all at once?",
    description:
      "Evaluation work that turns long agent traces into structured, evidence-linked assessments using raw context, compact digests, and anchored verdicts.",
    contribution: "Evaluation UX, judging architecture, and implementation",
    technologies: ["LLM evaluation", "Weave", "Evidence design"],
    artifact: "judge",
    position: [51, 64],
  },
  {
    slug: "weave-agent-adapter",
    title: "Weave Agent Adapter",
    year: 2026,
    displayYear: "2026",
    question: "What did the agent actually do?",
    description:
      "An adapter that turns agent activity into inspectable traces across multiple coding environments.",
    contribution: "Architecture, integrations, and observability",
    technologies: ["Python", "OpenTelemetry", "Weave"],
    repositoryUrl: "https://github.com/mattliu-mygit/Weave-Agent-Adapter",
    linkLabel: "View source",
    artifact: "trace",
    position: [71, 34],
  },
  {
    slug: "monopole",
    title: "Monopole",
    year: 2026,
    displayYear: "Now",
    question: "Can agents learn from completed work?",
    description:
      "A local evaluation workspace for reviewing completed agent runs and turning evidence into better future behavior.",
    contribution: "Product direction, evaluation design, and implementation",
    technologies: ["Python", "Agent evaluation", "Weave"],
    repositoryUrl: "https://github.com/mattliu-mygit/Monopole",
    linkLabel: "View source",
    artifact: "interface",
    position: [89, 16],
  },
];

export const projectBySlug = (slug: string) =>
  projects.find((project) => project.slug === slug);
