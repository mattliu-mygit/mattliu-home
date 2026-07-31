import type { Plugin } from "vite";

import {
  renderFallbackHtml,
  renderHeadTags,
  renderLlmsTxt,
  renderPortfolioJson,
  renderRobotsTxt,
  renderSitemapXml,
} from "./content-renderers";
import {
  siteContent,
  type SiteContent,
} from "../src/content/site-content";

type DiscoveryFile = {
  contentType: string;
  source: string;
};

export function discoveryFiles(
  content: SiteContent,
): Record<string, DiscoveryFile> {
  return {
    "portfolio.json": {
      contentType: "application/json; charset=utf-8",
      source: `${renderPortfolioJson(content)}\n`,
    },
    "llms.txt": {
      contentType: "text/plain; charset=utf-8",
      source: renderLlmsTxt(content),
    },
    "robots.txt": {
      contentType: "text/plain; charset=utf-8",
      source: renderRobotsTxt(content),
    },
    "sitemap.xml": {
      contentType: "application/xml; charset=utf-8",
      source: renderSitemapXml(content),
    },
  };
}

export function transformSiteHtml(html: string, content: SiteContent) {
  const fallbackHtml = renderFallbackHtml(content);
  const withLanguage = html.replace(
    /<html(?:\s+lang="[^"]*")?>/,
    `<html lang="${content.site.language}">`,
  );

  if (withLanguage.includes("data-static-fallback")) {
    return {
      html: withLanguage,
      tags: renderHeadTags(content),
      fallbackHtml,
    };
  }

  const root = '<div id="root"></div>';
  if (!withLanguage.includes(root)) {
    throw new Error('index.html must contain an empty <div id="root"></div>');
  }

  return {
    html: withLanguage.replace(
      root,
      `<div id="root">${fallbackHtml}</div>`,
    ),
    tags: renderHeadTags(content),
    fallbackHtml,
  };
}

export function siteContentPlugin(
  content: SiteContent = siteContent,
): Plugin {
  const files = discoveryFiles(content);

  return {
    name: "site-content",
    enforce: "pre",
    transformIndexHtml(html) {
      const transformed = transformSiteHtml(html, content);
      return {
        html: transformed.html,
        tags: [...transformed.tags],
      };
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.originalUrl
          ?.split("?", 1)[0]
          .replace(/^\//, "");
        const file = pathname ? files[pathname] : undefined;
        if (!file) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", file.contentType);
        response.setHeader("Cache-Control", "no-cache");
        response.end(file.source);
      });
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) {
        this.emitFile({
          type: "asset",
          fileName,
          source: file.source,
        });
      }
    },
  };
}
