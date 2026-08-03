import { describe, expect, it } from "vitest";

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

describe("content renderers", () => {
  it("renders canonical metadata and parseable ProfilePage JSON-LD", () => {
    const tags = renderHeadTags(siteContent);
    const canonical = tags.find(
      (tag) => tag.tag === "link" && tag.attrs?.rel === "canonical",
    );
    const jsonLd = tags.find(
      (tag) =>
        tag.tag === "script" &&
        tag.attrs?.type === "application/ld+json",
    );

    expect(canonical?.attrs?.href).toBe(
      "https://mliu.vercel.app/",
    );
    expect(tags).toContainEqual(
      expect.objectContaining({
        tag: "meta",
        attrs: {
          property: "og:url",
          content: "https://mliu.vercel.app/",
        },
      }),
    );

    const structuredData = JSON.parse(jsonLd?.children ?? "");
    expect(structuredData).toMatchObject({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: "https://mliu.vercel.app/",
      mainEntity: {
        "@type": "Person",
        name: "Matthew Liu",
        email: "mailto:mattliujhu@gmail.com",
      },
    });
    expect(structuredData.mainEntity.sameAs).toEqual([
      "https://github.com/mattliu-mygit",
      "https://www.linkedin.com/in/mattliuhew/",
    ]);
    expect(structuredData.hasPart).toHaveLength(5);
    expect(structuredData.hasPart[0]).toMatchObject({
      name: "Monopole",
      image: "https://mliu.vercel.app/project-previews/monopole.png",
    });
  });

  it("escapes fallback HTML and inline JSON for their output contexts", () => {
    const unsafe = structuredClone(siteContent) as SiteContent;
    (unsafe.person as { name: string }).name =
      'Matthew <script>alert("x")</script>';
    (unsafe.person as { introduction: string }).introduction =
      "</script><img src=x onerror=alert(1)>";

    const fallback = renderFallbackHtml(unsafe);
    const jsonLd = renderHeadTags(unsafe).find(
      (tag) => tag.attrs?.type === "application/ld+json",
    )?.children;

    expect(fallback).not.toContain("<script>alert");
    expect(fallback).toContain("&lt;script&gt;");
    expect(jsonLd).not.toContain("</script>");
    expect(JSON.parse(jsonLd ?? "").mainEntity.name).toContain("<script>");
  });

  it("renders a semantic fallback containing identity and every project", () => {
    const html = renderFallbackHtml(siteContent);

    expect(html).toContain("<h1>Matthew Liu");
    expect(html).toContain(siteContent.person.introduction);
    expect(html).toContain('href="mailto:mattliujhu@gmail.com"');
    expect(html.match(/target="_blank"/g)).toHaveLength(
      siteContent.person.links.length +
        siteContent.projects.filter(({ repositoryUrl }) => repositoryUrl).length,
    );
    expect(html).toContain('rel="noopener noreferrer"');
    for (const project of siteContent.projects) {
      expect(html).toContain(project.title);
      expect(html).toContain(project.description);
    }
  });

  it("renders stable public JSON without presentation-only fields", () => {
    const portfolio = JSON.parse(renderPortfolioJson(siteContent));

    expect(portfolio.schemaVersion).toBe(1);
    expect(portfolio.canonicalUrl).toBe(
      "https://mliu.vercel.app/",
    );
    expect(portfolio.person.email).toBe("mattliujhu@gmail.com");
    expect(portfolio.projects).toHaveLength(5);
    expect(portfolio.path).toEqual([
      expect.objectContaining({
        slug: "johns-hopkins",
        organization: "Johns Hopkins University",
        period: "2019–2023",
      }),
      expect.objectContaining({ slug: "aws-sagemaker" }),
      expect.objectContaining({ slug: "wandb-weave" }),
    ]);
    expect(portfolio.path[0]).not.toHaveProperty("position");
    expect(portfolio.quotes).toHaveLength(4);
    expect(portfolio.projects[0]).not.toHaveProperty("position");
    expect(portfolio.projects[0]).not.toHaveProperty("artifact");
    expect(portfolio.projects[0]).not.toHaveProperty("linkLabel");
    expect(portfolio.projects[0]).toMatchObject({
      slug: "monopole",
      preview: {
        image: "https://mliu.vercel.app/project-previews/monopole.png",
        alt: "Monopole evaluation dashboard showing real aggregate run metrics.",
        sourceUrl: "https://github.com/mattliu-mygit/Monopole",
      },
    });
    expect(
      portfolio.quotes.find(
        (quote: { slug: string }) => quote.slug === "failure-to-failure",
      ),
    ).toMatchObject({
      author: "Maybe Churchill",
      attributionNote:
        "Origin unknown; commonly misattributed to Winston Churchill.",
    });
  });

  it("renders concise agent orientation and crawler discovery files", () => {
    const llms = renderLlmsTxt(siteContent);
    const robots = renderRobotsTxt(siteContent);
    const sitemap = renderSitemapXml(siteContent);

    expect(llms).toContain("# Matthew Liu");
    expect(llms).toContain(
      "## Path\n\n- Johns Hopkins University",
    );
    expect(renderFallbackHtml(siteContent)).toContain(
      "Johns Hopkins University",
    );
    expect(llms).toContain(
      "[Machine-readable portfolio](https://mliu.vercel.app/portfolio.json)",
    );
    expect(robots).toContain("User-agent: OAI-SearchBot");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(
      "Sitemap: https://mliu.vercel.app/sitemap.xml",
    );
    expect(sitemap).toContain(
      "<loc>https://mliu.vercel.app/</loc>",
    );
  });
});
