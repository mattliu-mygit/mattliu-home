# Personal Universe v0 Design

## Goal

Publish Matthew Liu's personal homepage as a clean, atmospheric portfolio where each project is a constellation rather than a conventional card. The first release should feel distinctive within seconds, remain easy to scan, and give a broad audience a truthful view of the work.

## Product position

The homepage presents Matthew as an engineer interested in making AI systems inspectable, evaluable, and easier to improve. The core line is:

> Software should show its work.

The visual metaphor supports the story rather than replacing it. Visitors should understand who Matthew is, what he works on, and how to inspect a project without learning a novel navigation system.

## Page structure

The desktop experience is one bounded universe with no panning, zooming, or dragging.

- A central quiet zone contains Matthew's name, the core line, one short supporting sentence, and links to GitHub, LinkedIn, and email.
- Five project constellations occupy a broad arc around the quiet zone. They move clockwise from older work at the lower left to current work at the upper right.
- Each constellation contains one named primary star and two to five smaller connected stars. Its shape is unique and stable across visits.
- Sparse ambient stars fill the remaining field. They are decorative, dim, deterministic, and never compete with project constellations.
- Project constellations stay outside the quiet zone at all supported desktop widths.

The five v0 projects are:

1. Voyage into Space — 2020
2. Focal Point — 2021
3. Otter — 2022
4. Weave Agent Adapter — 2026
5. Monopole — 2026, current

Chronology is perceptual rather than diagrammatic: position, year labels, and increasing primary-star brightness suggest direction. There is no route line crossing the page.

## Interaction

- Hovering or focusing a project brightens only that constellation and reveals its short project label and year.
- Clicking a project opens a centered project lens above a dimmed universe.
- The lens contains a project question, concise description, role or contribution, technologies, a truthful artifact preview, and source/demo links when available.
- Closing the lens, clicking its backdrop, or pressing Escape returns to the universe.
- The browser back button closes an open project before leaving the page.
- The selected project can be addressed with a URL fragment such as `#monopole`.

Motion is restrained:

- Constellation lines draw in once on first load.
- Ambient stars use nearly imperceptible opacity drift.
- Hover and lens transitions last no more than 300 milliseconds.
- `prefers-reduced-motion` removes nonessential motion.

## Artifact previews

Every project lens includes a preview that is clearly an artifact, not a fabricated product screenshot.

- Monopole: a capture from the actual local interface, stored as a static image.
- Weave Agent Adapter: a compact trace specimen derived from real adapter output.
- Otter: a before-and-after code or text transformation derived from actual output.
- Focal Point: artwork or a gameplay capture from the repository.
- Voyage into Space: artwork or a gameplay capture from the repository.

If a usable artifact cannot be captured for v0, the fallback is a deliberately abstract, labeled specimen built from verified project data. The site must not imply that an invented mockup is the real interface.

## Responsive behavior

At narrow widths, the universe becomes a vertical celestial journey:

- The introduction appears first.
- Project constellations stack in chronological order with generous vertical separation.
- Each constellation remains a button and retains its unique star pattern.
- The project lens becomes a full-height bottom sheet.
- Decorative ambient stars are reduced to preserve readability and battery life.

## Content model

Project content lives in one typed data file. Each project provides:

- stable slug
- title
- year and sort order
- one project question
- one-sentence description
- contribution
- technology labels
- repository and optional demo URL
- artifact type and local asset reference
- constellation points and connections

The page renders navigation, constellation labels, and lenses from this single source.

## Technical architecture

- React with TypeScript and Vite
- Bun for package management and local commands
- Semantic HTML and CSS for the star field and constellation geometry
- SVG inside each constellation for connecting lines
- Native browser history for project fragments
- Vitest and Testing Library for interaction and content-model tests
- Playwright for desktop and mobile smoke tests
- Vercel static deployment

v0 does not use shadcn/ui. Its only dialog-like surface is purpose-built for the project lens, so installing a component collection would add weight without improving reuse or accessibility.

## Accessibility and performance

- Every constellation is a real button with an accessible project name.
- Keyboard focus is always visible.
- The project lens traps focus while open and restores focus to its constellation when closed.
- Text and interactive elements meet WCAG AA contrast.
- Decorative stars are hidden from assistive technology.
- The page remains understandable with CSS animations disabled.
- No WebGL, canvas renderer, runtime image generation, or large animation library is used.
- The initial production bundle should stay below 200 kB compressed excluding artifact images.

## Error and fallback behavior

- Missing artifact images show a labeled abstract specimen rather than a broken image.
- Invalid URL fragments render the homepage without an error.
- External links open normally even when JavaScript is unavailable.
- With JavaScript disabled, the introduction and a chronological project list remain readable.

## Release scope

v0 includes one page, five projects, responsive layouts, project lenses, truthful artifact previews, external links, automated interaction tests, a public GitHub repository, and a Vercel production deployment.

v0 excludes a CMS, blog, analytics, contact form, theme switcher, WebGL, sound, search, and editable project data.

## Success criteria

- A first-time visitor can identify Matthew's focus and open a project within ten seconds.
- No project constellation or label enters the central quiet zone at the desktop test widths.
- All five projects are reachable by mouse, keyboard, touch, and direct URL fragment.
- The chronological direction remains understandable without a visible timeline.
- The desktop and mobile smoke tests pass against the production build.
- The public repository and deployed site contain no private or machine-specific data.
