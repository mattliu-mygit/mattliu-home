import type { Quote } from "../content/site-content";
import { ExternalLink } from "./ExternalLink";

export function QuoteReadout({
  hidden,
  quote,
}: {
  hidden: boolean;
  quote: Quote;
}) {
  return (
    <figure
      aria-hidden={hidden ? "true" : undefined}
      aria-live={hidden ? undefined : "polite"}
      className="quote-readout"
      data-hidden={hidden ? "true" : undefined}
    >
      <blockquote>{quote.text}</blockquote>
      <figcaption>
        <ExternalLink href={quote.sourceUrl} tabIndex={hidden ? -1 : 0}>
          {quote.author} <span aria-hidden="true">↗</span>
        </ExternalLink>
      </figcaption>
    </figure>
  );
}
