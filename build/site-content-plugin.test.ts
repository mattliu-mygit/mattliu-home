import { describe, expect, it, vi } from "vitest";

import {
  discoveryFiles,
  siteContentPlugin,
  transformSiteHtml,
} from "./site-content-plugin";
import { siteContent } from "../src/content/site-content";

describe("site content Vite plugin", () => {
  it("injects derived head tags and fallback content exactly once", () => {
    const source =
      '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
    const transformed = transformSiteHtml(source, siteContent);

    expect(transformed.html).toContain(
      `<div id="root">${transformed.fallbackHtml}</div>`,
    );
    expect(transformed.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "link",
          attrs: {
            rel: "canonical",
            href: "https://mattliu-home.vercel.app/",
          },
        }),
      ]),
    );
    expect(
      transformSiteHtml(transformed.html, siteContent).html.match(
        /data-static-fallback/g,
      ),
    ).toHaveLength(1);
  });

  it("describes the four root discovery files with content types", () => {
    const files = discoveryFiles(siteContent);

    expect(Object.keys(files)).toEqual([
      "portfolio.json",
      "llms.txt",
      "robots.txt",
      "sitemap.xml",
    ]);
    expect(files["portfolio.json"].contentType).toBe(
      "application/json; charset=utf-8",
    );
    expect(files["sitemap.xml"].contentType).toBe(
      "application/xml; charset=utf-8",
    );
  });

  it("serves discovery files through development middleware", () => {
    const plugin = siteContentPlugin();
    let middleware:
      | ((
          request: { originalUrl?: string },
          response: {
            statusCode: number;
            setHeader: (name: string, value: string) => void;
            end: (body?: string) => void;
          },
          next: () => void,
        ) => void)
      | undefined;

    const configureServer = plugin.configureServer as (server: {
      middlewares: { use: (handler: typeof middleware) => void };
    }) => void;
    configureServer({
      middlewares: {
        use: (handler) => {
          middleware = handler;
        },
      },
    });

    const headers = new Map<string, string>();
    const end = vi.fn();
    middleware?.(
      { originalUrl: "/portfolio.json?cache=1" },
      {
        statusCode: 0,
        setHeader: (name, value) => headers.set(name, value),
        end,
      },
      vi.fn(),
    );

    expect(headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(JSON.parse(end.mock.calls[0][0]).schemaVersion).toBe(1);
  });

  it("emits every discovery file during a production build", () => {
    const plugin = siteContentPlugin();
    const emitFile = vi.fn();
    const generateBundle = plugin.generateBundle as (
      this: { emitFile: typeof emitFile },
    ) => void;

    generateBundle.call({ emitFile });

    expect(emitFile).toHaveBeenCalledTimes(4);
    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "asset",
        fileName: "llms.txt",
      }),
    );
  });
});
