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
  repositoryUrl: string;
  artifact: "interface" | "trace" | "diff" | "pixel" | "space";
  position: { x: number; y: number };
  stars: readonly Point[];
  connections: readonly (readonly [from: number, to: number])[];
};

export const projects = [
  {
    slug: "voyage-into-space",
    title: "Voyage into Space",
    year: 2020,
    displayYear: "2020",
    question: "How far can a tiny world carry you?",
    description:
      "An early browser game about motion, obstacles, and discovering a world one screen at a time.",
    contribution: "Game design and implementation",
    technologies: ["JavaScript", "Canvas", "Game design"],
    repositoryUrl: "https://github.com/mattliu-mygit/voyage-into-space",
    artifact: "space",
    position: { x: 3, y: 72 },
    stars: [
      [8, 55],
      [35, 24],
      [62, 40],
      [83, 12],
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    slug: "focal-point",
    title: "Focal Point",
    year: 2021,
    displayYear: "2021",
    question: "Can focus become a game mechanic?",
    description:
      "A compact game experiment that turns attention, timing, and a constrained field of view into play.",
    contribution: "Game design, art integration, and implementation",
    technologies: ["JavaScript", "Game design", "Pixel art"],
    repositoryUrl: "https://github.com/mattliu-mygit/Focal-Point-1",
    artifact: "pixel",
    position: { x: 8, y: 32 },
    stars: [
      [6, 42],
      [28, 14],
      [54, 31],
      [75, 8],
      [91, 38],
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
    ],
  },
  {
    slug: "otter",
    title: "Otter",
    year: 2022,
    displayYear: "2022",
    question: "What changes when a tool explains the edit?",
    description:
      "An exploration of code and text transformation with the before-and-after kept visible.",
    contribution: "Product design and implementation",
    technologies: ["Python", "Language tooling", "Developer UX"],
    repositoryUrl: "https://github.com/mattliu-mygit/Otter",
    artifact: "diff",
    position: { x: 40, y: 3 },
    stars: [
      [8, 16],
      [31, 42],
      [56, 18],
      [78, 49],
      [93, 20],
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
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
    artifact: "trace",
    position: { x: 74, y: 28 },
    stars: [
      [7, 47],
      [29, 20],
      [53, 39],
      [75, 12],
      [94, 31],
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
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
    technologies: ["TypeScript", "React", "Agent evaluation"],
    repositoryUrl: "https://github.com/mattliu-mygit/Monopole",
    artifact: "interface",
    position: { x: 82, y: 4 },
    stars: [
      [8, 49],
      [31, 14],
      [55, 34],
      [74, 7],
      [94, 45],
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
    ],
  },
] as const satisfies readonly Project[];

export const projectBySlug = (slug: string) =>
  projects.find((project) => project.slug === slug);
