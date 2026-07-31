import type { SiteContent } from "../src/content/site-content";

export type HtmlTagDescriptor = {
  tag: string;
  attrs?: Record<string, string>;
  children?: string;
  injectTo?: "head" | "head-prepend" | "body" | "body-prepend";
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeXml = escapeHtml;

const safeInlineJson = (value: unknown) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

const siteUrl = (content: SiteContent, path: string) =>
  new URL(path, content.site.canonicalUrl).href;

const structuredData = (content: SiteContent) => {
  const personId = `${content.site.canonicalUrl}#person`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: content.site.canonicalUrl,
    name: content.site.title,
    description: content.site.description,
    mainEntity: {
      "@id": personId,
      "@type": "Person",
      name: content.person.name,
      alternateName: content.person.alternateName,
      jobTitle: content.person.role,
      description: content.person.introduction,
      homeLocation: {
        "@type": "Place",
        name: content.person.location,
      },
      url: content.site.canonicalUrl,
      sameAs: content.person.links.map((link) => link.url),
    },
    hasPart: content.projects.map((project) => ({
      "@type": "CreativeWork",
      name: project.title,
      description: project.description,
      abstract: project.question,
      dateCreated: String(project.year),
      creator: { "@id": personId },
      ...(project.repositoryUrl ? { url: project.repositoryUrl } : {}),
      keywords: project.technologies.join(", "),
    })),
  };
};

export function renderHeadTags(
  content: SiteContent,
): readonly HtmlTagDescriptor[] {
  return [
    {
      tag: "title",
      children: content.site.title,
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "description", content: content.site.description },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "robots", content: "index, follow" },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "theme-color", content: content.site.themeColor },
      injectTo: "head",
    },
    {
      tag: "link",
      attrs: { rel: "canonical", href: content.site.canonicalUrl },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { property: "og:type", content: "profile" },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { property: "og:url", content: content.site.canonicalUrl },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { property: "og:title", content: content.site.title },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: {
        property: "og:description",
        content: content.site.socialDescription,
      },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { property: "og:locale", content: content.site.locale },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "twitter:card", content: "summary" },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: "twitter:title", content: content.site.title },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: {
        name: "twitter:description",
        content: content.site.socialDescription,
      },
      injectTo: "head",
    },
    {
      tag: "script",
      attrs: { type: "application/ld+json" },
      children: safeInlineJson(structuredData(content)),
      injectTo: "head",
    },
  ];
}

export function renderFallbackHtml(content: SiteContent): string {
  const links = content.person.links
    .map(
      (link) =>
        `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`,
    )
    .join("");
  const projects = content.projects
    .map((project) => {
      const title = project.repositoryUrl
        ? `<a href="${escapeHtml(project.repositoryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.title)}</a>`
        : escapeHtml(project.title);
      return [
        "<li>",
        `<h3>${title}</h3>`,
        `<p>${escapeHtml(project.displayYear)} · ${escapeHtml(project.contribution)}</p>`,
        `<p>${escapeHtml(project.description)}</p>`,
        "</li>",
      ].join("");
    })
    .join("");
  const path = content.path
    .map(
      (entry) =>
        `<li><h3>${escapeHtml(entry.organization)}</h3><p>${escapeHtml(entry.area)}</p><p>${escapeHtml(entry.summary)}</p></li>`,
    )
    .join("");

  return [
    '<main class="seo-fallback" data-static-fallback>',
    `<header><h1>${escapeHtml(content.person.name)} — ${escapeHtml(content.person.headline)}</h1>`,
    `<p>${escapeHtml(content.person.introduction)}</p>`,
    `<ul aria-label="Profiles">${links}</ul></header>`,
    `<section aria-labelledby="fallback-path"><h2 id="fallback-path">Path</h2><ol>${path}</ol></section>`,
    `<section aria-labelledby="fallback-projects"><h2 id="fallback-projects">Projects</h2><ol>${projects}</ol></section>`,
    "</main>",
  ].join("");
}

export function renderPortfolioJson(content: SiteContent): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      canonicalUrl: content.site.canonicalUrl,
      person: {
        name: content.person.name,
        alternateName: content.person.alternateName,
        role: content.person.role,
        location: content.person.location,
        headline: content.person.headline,
        introduction: content.person.introduction,
        profiles: content.person.links,
      },
      path: content.path.map(
        ({ position: _position, depth: _depth, ...entry }) => entry,
      ),
      projects: content.projects.map((project) => ({
        slug: project.slug,
        title: project.title,
        year: project.year,
        displayYear: project.displayYear,
        question: project.question,
        description: project.description,
        contribution: project.contribution,
        technologies: project.technologies,
        ...(project.repositoryUrl ? { url: project.repositoryUrl } : {}),
      })),
      quotes: content.quotes.map((quote) => ({
        slug: quote.slug,
        text: quote.text,
        author: quote.author,
        sourceUrl: quote.sourceUrl,
        ...(quote.attributionNote
          ? { attributionNote: quote.attributionNote }
          : {}),
      })),
    },
    null,
    2,
  );
}

export function renderLlmsTxt(content: SiteContent): string {
  const path = content.path
    .map(
      (entry) =>
        `- ${entry.organization} — ${entry.area}: ${entry.summary}`,
    )
    .join("\n");
  const projects = content.projects
    .map((project) => {
      const title = project.repositoryUrl
        ? `[${project.title}](${project.repositoryUrl})`
        : project.title;
      return `- ${title}: ${project.description}`;
    })
    .join("\n");
  const profiles = content.person.links
    .map((link) => `- [${link.label}](${link.url})`)
    .join("\n");

  return [
    `# ${content.person.name}`,
    "",
    `> ${content.person.introduction}`,
    "",
    "This is a personal portfolio. The JSON endpoint is the authoritative",
    "machine-readable representation of its public content.",
    "",
    "## Path",
    "",
    path,
    "",
    "## Portfolio",
    "",
    projects,
    "",
    "## Structured data",
    "",
    `- [Homepage](${content.site.canonicalUrl})`,
    `- [Machine-readable portfolio](${siteUrl(content, "portfolio.json")})`,
    "",
    "## Profiles",
    "",
    profiles,
    "",
  ].join("\n");
}

export function renderRobotsTxt(content: SiteContent): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    `Sitemap: ${siteUrl(content, "sitemap.xml")}`,
    "",
  ].join("\n");
}

export function renderSitemapXml(content: SiteContent): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${escapeXml(content.site.canonicalUrl)}</loc>`,
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}
