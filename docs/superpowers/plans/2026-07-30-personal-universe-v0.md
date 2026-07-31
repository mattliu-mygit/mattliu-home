# Personal Universe v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish Matthew Liu's single-page constellation portfolio with five truthful project previews.

**Architecture:** A Vite React application renders all navigation and project detail content from one typed project catalog. CSS and small inline SVGs create the bounded desktop universe and chronological mobile journey; URL fragments and one accessible modal component control project selection without a router.

**Tech Stack:** Bun, Vite, React, TypeScript, Vitest, Testing Library, Playwright, CSS, Vercel

## Global Constraints

- The desktop page has no panning, zooming, dragging, WebGL, canvas renderer, runtime image generation, or large animation library.
- Five project constellations sit outside a central quiet zone and imply chronology from lower-left to upper-right.
- All five projects are reachable by mouse, keyboard, touch, and direct URL fragment.
- Artifact previews are truthful specimens or verified repository assets, never invented product screenshots.
- `prefers-reduced-motion` removes nonessential motion.
- The production JavaScript bundle stays below 200 kB compressed excluding artifact images.
- The public repository and deployment contain no private or machine-specific data.

---

### Task 1: Application foundation and project catalog

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/projects.ts`
- Create: `src/projects.test.ts`

**Interfaces:**
- Produces: `Project` and `projects: readonly Project[]`
- Produces: `projectBySlug(slug: string): Project | undefined`

- [ ] **Step 1: Write the failing catalog test**

```ts
import { describe, expect, it } from "vitest";
import { projectBySlug, projects } from "./projects";

describe("project catalog", () => {
  it("keeps projects in chronological order with unique slugs", () => {
    expect(projects.map((project) => project.year)).toEqual([2020, 2021, 2022, 2026, 2026]);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length);
  });

  it("finds a project by its public fragment", () => {
    expect(projectBySlug("monopole")?.title).toBe("Monopole");
    expect(projectBySlug("missing")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bunx vitest run src/projects.test.ts`

Expected: FAIL because `src/projects.ts` does not exist.

- [ ] **Step 3: Add the minimal Vite foundation and typed project catalog**

Use React 19, Vite 7, TypeScript 5, Vitest 3, Testing Library 16, and Playwright 1.54. Define:

```ts
export type Point = readonly [x: number, y: number];
export type Project = {
  slug: string;
  title: string;
  year: number;
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
    question: "How far can a tiny world carry you?",
    description: "An early browser game about motion, obstacles, and discovering a world one screen at a time.",
    contribution: "Game design and implementation",
    technologies: ["JavaScript", "Canvas", "Game design"],
    repositoryUrl: "https://github.com/mattliu-mygit/voyage-into-space",
    artifact: "space",
    position: { x: 8, y: 74 },
    stars: [[8, 55], [35, 24], [62, 40], [83, 12]],
    connections: [[0, 1], [1, 2], [2, 3]],
  },
  {
    slug: "focal-point",
    title: "Focal Point",
    year: 2021,
    question: "Can focus become a game mechanic?",
    description: "A compact game experiment that turns attention, timing, and a constrained field of view into play.",
    contribution: "Game design, art integration, and implementation",
    technologies: ["JavaScript", "Game design", "Pixel art"],
    repositoryUrl: "https://github.com/mattliu-mygit/Focal-Point-1",
    artifact: "pixel",
    position: { x: 12, y: 38 },
    stars: [[6, 42], [28, 14], [54, 31], [75, 8], [91, 38]],
    connections: [[0, 1], [1, 2], [2, 3], [2, 4]],
  },
  {
    slug: "otter",
    title: "Otter",
    year: 2022,
    question: "What changes when a tool explains the edit?",
    description: "An exploration of code and text transformation with the before-and-after kept visible.",
    contribution: "Product design and implementation",
    technologies: ["Python", "Language tooling", "Developer UX"],
    repositoryUrl: "https://github.com/mattliu-mygit/Otter",
    artifact: "diff",
    position: { x: 42, y: 7 },
    stars: [[8, 16], [31, 42], [56, 18], [78, 49], [93, 20]],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    slug: "weave-agent-adapter",
    title: "Weave Agent Adapter",
    year: 2026,
    question: "What did the agent actually do?",
    description: "An adapter that turns agent activity into inspectable traces across multiple coding environments.",
    contribution: "Architecture, integrations, and observability",
    technologies: ["Python", "OpenTelemetry", "Weave"],
    repositoryUrl: "https://github.com/mattliu-mygit/Weave-Agent-Adapter",
    artifact: "trace",
    position: { x: 69, y: 24 },
    stars: [[7, 47], [29, 20], [53, 39], [75, 12], [94, 31]],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    slug: "monopole",
    title: "Monopole",
    year: 2026,
    question: "Can agents learn from completed work?",
    description: "A local evaluation workspace for reviewing completed agent runs and turning evidence into better future behavior.",
    contribution: "Product direction, evaluation design, and implementation",
    technologies: ["TypeScript", "React", "Agent evaluation"],
    repositoryUrl: "https://github.com/mattliu-mygit/Monopole",
    artifact: "interface",
    position: { x: 83, y: 8 },
    stars: [[8, 49], [31, 14], [55, 34], [74, 7], [94, 45]],
    connections: [[0, 1], [1, 2], [2, 3], [2, 4]],
  },
] as const satisfies readonly Project[];

export const projectBySlug = (slug: string) =>
  projects.find((project) => project.slug === slug);
```

- [ ] **Step 4: Run the catalog test and verify GREEN**

Run: `bunx vitest run src/projects.test.ts`

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock index.html tsconfig.json vite.config.ts src/main.tsx src/projects.ts src/projects.test.ts
git commit -m "feat: add typed portfolio catalog"
```

### Task 2: Universe, constellations, and protected quiet zone

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/Constellation.tsx`
- Create: `src/components/AmbientStars.tsx`
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: `Project` and `projects`
- Produces: `Constellation({ project, onSelect })`
- Produces: `App()` with a visible central introduction and five project buttons

- [ ] **Step 1: Write the failing universe tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("personal universe", () => {
  it("renders the quiet-zone introduction and five project constellations", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /software should show its work/i })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /^explore /i })).toHaveLength(5);
  });

  it("renders projects in chronological DOM order", () => {
    render(<App />);
    expect(screen.getAllByTestId("project-year").map((node) => node.textContent)).toEqual([
      "2020", "2021", "2022", "2026", "Now",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `bunx vitest run src/App.test.tsx`

Expected: FAIL because `src/App.tsx` does not exist.

- [ ] **Step 3: Implement the semantic universe**

`Constellation` renders one button containing an SVG with line and circle elements:

```tsx
export function Constellation({ project, onSelect }: Props) {
  return (
    <button
      className={`constellation constellation--${project.slug}`}
      style={{ "--x": `${project.position.x}%`, "--y": `${project.position.y}%` } as CSSProperties}
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
          <circle key={`${x}-${y}`} cx={x} cy={y} r={index === 0 ? 2.6 : 1.5} />
        ))}
      </svg>
      <span className="constellation__label">{project.title}</span>
      <span className="constellation__year" data-testid="project-year">
        {project.slug === "monopole" ? "Now" : project.year}
      </span>
    </button>
  );
}
```

`App` maps `projects` into constellations around:

```tsx
<main className="universe">
  <AmbientStars />
  <header className="quiet-zone">
    <p className="eyebrow">Matthew Liu · software engineer</p>
    <h1>Software should<br /><em>show its work.</em></h1>
    <p>I build tools that help people inspect, evaluate, and improve intelligent systems.</p>
  </header>
  <section className="project-sky" aria-label="Selected work">
    {projects.map((project) => (
      <Constellation key={project.slug} project={project} onSelect={openProject} />
    ))}
  </section>
</main>
```

- [ ] **Step 4: Run the universe tests and verify GREEN**

Run: `bunx vitest run src/App.test.tsx`

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Constellation.tsx src/components/AmbientStars.tsx src/App.test.tsx
git commit -m "feat: render constellation portfolio"
```

### Task 3: Accessible project lens and URL fragments

**Files:**
- Create: `src/components/ProjectLens.tsx`
- Create: `src/components/ArtifactPreview.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `Project`
- Produces: `ProjectLens({ project, onClose })`
- Produces: fragment-based selection with invalid-fragment fallback

- [ ] **Step 1: Add failing interaction tests**

```tsx
import userEvent from "@testing-library/user-event";

it("opens and closes a project lens while restoring focus", async () => {
  const user = userEvent.setup();
  render(<App />);
  const trigger = screen.getByRole("button", { name: "Explore Monopole" });
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "Monopole" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("opens a project from a valid URL fragment and ignores an invalid one", () => {
  window.location.hash = "#otter";
  const first = render(<App />);
  expect(screen.getByRole("dialog", { name: "Otter" })).toBeVisible();
  first.unmount();
  window.location.hash = "#not-a-project";
  render(<App />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the interaction tests and verify RED**

Run: `bunx vitest run src/App.test.tsx`

Expected: FAIL because no dialog or fragment behavior exists.

- [ ] **Step 3: Implement the lens, artifacts, and history**

Use a native `<dialog>` opened with `showModal()`. On open, assign `history.pushState(null, "", "#slug")`; on close, replace the URL with its pathname. Listen for `hashchange` and resolve only slugs in `projectBySlug`. The lens contains:

```tsx
<dialog ref={dialogRef} className="project-lens" aria-labelledby={`${project.slug}-title`}>
  <button className="project-lens__close" aria-label="Close project" onClick={onClose}>Close</button>
  <div className="project-lens__copy">
    <p>{project.year} · selected work</p>
    <h2 id={`${project.slug}-title`}>{project.question}</h2>
    <p>{project.description}</p>
    <p>{project.contribution}</p>
    <ul>{project.technologies.map((technology) => <li key={technology}>{technology}</li>)}</ul>
    <a href={project.repositoryUrl}>View source</a>
  </div>
  <ArtifactPreview project={project} />
</dialog>
```

`ArtifactPreview` renders five labeled HTML/CSS specimens: evaluation bars, trace spans, a before/after diff, a pixel-game scene, and a small space scene. Every preview includes `data-artifact={project.artifact}` and visible text naming what is represented.

- [ ] **Step 4: Run all component tests and verify GREEN**

Run: `bunx vitest run`

Expected: all component and catalog tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components/ProjectLens.tsx src/components/ArtifactPreview.tsx
git commit -m "feat: add accessible project lens"
```

### Task 4: Visual system, responsive journey, and browser smoke tests

**Files:**
- Create: `src/styles.css`
- Create: `playwright.config.ts`
- Create: `tests/universe.spec.ts`
- Create: `public/favicon.svg`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: stable class names and `data-artifact` values from Tasks 2 and 3
- Produces: desktop quiet-zone exclusion and mobile chronological layout

- [ ] **Step 1: Write failing desktop and mobile smoke tests**

```ts
import { expect, test } from "@playwright/test";

test("project constellations stay outside the desktop quiet zone", async ({ page }) => {
  await page.goto("/");
  const quiet = await page.locator(".quiet-zone").boundingBox();
  for (const button of await page.getByRole("button", { name: /^Explore / }).all()) {
    const box = await button.boundingBox();
    expect(box && quiet).toBeTruthy();
    expect(
      box!.right > quiet!.x &&
      box!.x < quiet!.x + quiet!.width &&
      box!.y + box!.height > quiet!.y &&
      box!.y < quiet!.y + quiet!.height
    ).toBe(false);
  }
});

test("mobile presents projects chronologically and opens a lens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const years = await page.getByTestId("project-year").allTextContents();
  expect(years).toEqual(["2020", "2021", "2022", "2026", "Now"]);
  await page.getByRole("button", { name: "Explore Otter" }).click();
  await expect(page.getByRole("dialog", { name: "Otter" })).toBeVisible();
});
```

- [ ] **Step 2: Run smoke tests and verify RED**

Run: `bunx playwright test`

Expected: FAIL because the stylesheet and Playwright configuration do not exist.

- [ ] **Step 3: Implement the visual and responsive system**

Use this layout contract, then add the color, typography, artifact, and focus styles around it:

```css
.universe { position: relative; min-height: 100svh; overflow: hidden; }
.quiet-zone {
  position: absolute;
  left: 50%;
  top: 55%;
  z-index: 3;
  width: clamp(25rem, 44vw, 42rem);
  transform: translate(-50%, -50%);
}
.project-sky { position: absolute; inset: 5rem 2rem 2rem; }
.constellation {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: min(11rem, 18vw);
  min-height: 7rem;
}
.constellation svg line { stroke: color-mix(in srgb, currentColor 42%, transparent); }
.constellation:is(:hover, :focus-visible) { color: var(--gold); }

@media (max-width: 760px) {
  .universe { overflow: visible; }
  .quiet-zone { position: relative; inset: auto; width: auto; transform: none; }
  .project-sky { position: relative; inset: auto; display: grid; }
  .constellation {
    position: relative;
    left: auto;
    top: auto;
    width: min(18rem, 80vw);
    min-height: 12rem;
  }
  .project-lens { width: 100vw; height: 100svh; max-width: none; max-height: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 4: Verify tests, build, and bundle size**

Run:

```bash
bunx vitest run
bunx playwright test
bun run build
gzip -c dist/assets/*.js | wc -c
```

Expected: all tests pass, Vite exits 0, and compressed JavaScript is under 200,000 bytes.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/main.tsx playwright.config.ts tests/universe.spec.ts public/favicon.svg
git commit -m "feat: finish responsive universe"
```

### Task 5: Public release

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `vercel.json`
- Modify: `index.html`

**Interfaces:**
- Consumes: passing production build from Task 4
- Produces: public GitHub repository and verified Vercel deployment

- [ ] **Step 1: Add release metadata**

Create `.gitignore` with:

```gitignore
node_modules
dist
playwright-report
test-results
.vercel
.env
.env.*
!.env.example
```

Create `vercel.json` with:

```json
{
  "framework": "vite",
  "buildCommand": "bun run build",
  "outputDirectory": "dist"
}
```

`README.md` explains the constellation interaction, `bun install`, `bun run dev`, `bun test`, the artifact-truthfulness policy, and the stack. Update `index.html` with the final title, description, theme color, favicon, and social metadata without an invented social image.

- [ ] **Step 2: Run the full release verification**

Run:

```bash
bunx vitest run
bunx playwright test
bun run build
git status --short
```

Expected: tests and build pass; only intended release files are uncommitted.

- [ ] **Step 3: Commit the release metadata**

```bash
git add README.md .gitignore vercel.json index.html bun.lock
git commit -m "chore: prepare v0 release"
```

- [ ] **Step 4: Publish the public repository**

Reauthenticate `gh`, create `mattliu-mygit/mattliu-home` as public, add it as `origin`, and push `main`. Verify the repository page is publicly readable.

- [ ] **Step 5: Deploy production to Vercel**

Authenticate the Vercel CLI, link the GitHub repository, run a production deployment, then load the returned URL and repeat the desktop open/close and mobile smoke checks against production.
