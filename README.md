# Matthew Liu — Personal Universe

A one-page portfolio organized as a quiet, interactive universe. Projects and
quotes begin as distant, labeled constellations. Selecting one runs a bounded
camera transition into its stars; project stars open an inspectable lens.

## Edit content

All identity, profile, project, quote, metadata, and constellation content lives
in [`src/content/site-content.json`](src/content/site-content.json). Validation
stops development and production builds when public links, slugs, artifact
types, coordinates, or the canonical URL are invalid.

The same store generates the visible React interface and these build outputs:

- `/portfolio.json` — stable machine-readable portfolio data
- `/llms.txt` — experimental LLM-oriented site summary
- `/robots.txt` — crawler access and sitemap discovery
- `/sitemap.xml` — canonical homepage URL

`llms.txt` is an emerging convention, not a search-ranking guarantee. Generated
files are emitted by Vite and are not committed.

## Run locally

```bash
bun install
bun run dev
```

## Verify

```bash
bun run test
bun run test:e2e
bun run build
```

## Artifact policy

Project previews are labeled specimens based on real project concepts or repository material. They are not presented as screenshots of interfaces that do not exist.

## Stack

React, TypeScript, Vite, Vitest, Playwright, and custom CSS. The production site
is deployed on Vercel.
