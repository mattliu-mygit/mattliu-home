import type { Point } from "./projects";

export type Quote = {
  slug: string;
  text: string;
  author: string;
  sourceUrl: string;
  position: Point;
};

export const quotes: readonly Quote[] = [
  {
    slug: "less-is-more",
    text: "Less is more.",
    author: "Ludwig Mies van der Rohe",
    sourceUrl: "https://www.moma.org/collection/artists/7166",
    position: [14, 58],
  },
  {
    slug: "failure-to-failure",
    text: "Success is going from failure to failure without losing your enthusiasm.",
    author: "Attribution unknown",
    sourceUrl:
      "https://winstonchurchill.org/resources/quotes/quotes-falsely-attributed/",
    position: [29, 29],
  },
  {
    slug: "strong-opinions",
    text: "Strong opinions, weakly held.",
    author: "Paul Saffo",
    sourceUrl: "https://hbr.org/podcast/2007/07/harvard-business-ideacast-51-s",
    position: [43, 67],
  },
  {
    slug: "simplicity-follows",
    text: "Simplicity does not precede complexity, but follows it.",
    author: "Alan Perlis",
    sourceUrl: "https://cs.yale.edu/homes/perlis-alan/quotes.html",
    position: [57, 38],
  },
  {
    slug: "create-understand",
    text: "What I cannot create, I do not understand.",
    author: "Richard Feynman",
    sourceUrl:
      "https://magazine.caltech.edu/post/biology-through-the-eyes-of-a-physicist",
    position: [69, 73],
  },
  {
    slug: "computing-is-insight",
    text: "The purpose of computing is insight, not numbers.",
    author: "Richard Hamming",
    sourceUrl: "https://old.maa.org/node/111904",
    position: [80, 42],
  },
  {
    slug: "reality-precedes",
    text: "Reality must take precedence over public relations, for nature cannot be fooled.",
    author: "Richard Feynman",
    sourceUrl: "https://shepherd.caltech.edu/html/quotes.html",
    position: [91, 17],
  },
];
