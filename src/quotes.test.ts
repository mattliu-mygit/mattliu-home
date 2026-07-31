import { describe, expect, it } from "vitest";

import { quotes } from "./quotes";

describe("quote catalog", () => {
  it("contains the seven selected quotes with unique slugs", () => {
    expect(quotes).toHaveLength(7);
    expect(new Set(quotes.map((quote) => quote.slug)).size).toBe(quotes.length);
  });

  it("does not repeat the disputed Churchill attribution", () => {
    const quote = quotes.find(
      (candidate) => candidate.slug === "failure-to-failure",
    );

    expect(quote?.author).toBe("Attribution unknown");
    expect(quote?.sourceUrl).toContain("winstonchurchill.org");
  });

  it("anchors the collection in restraint, inquiry, and evidence", () => {
    expect(quotes.map((quote) => quote.author)).toEqual([
      "Ludwig Mies van der Rohe",
      "Attribution unknown",
      "Paul Saffo",
      "Alan Perlis",
      "Richard Feynman",
      "Richard Hamming",
      "Richard Feynman",
    ]);
  });
});
