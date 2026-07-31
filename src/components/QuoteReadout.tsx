import type { Quote } from "../content/site-content";

export function QuoteReadout({ quote }: { quote: Quote }) {
  return (
    <figure className="quote-readout" aria-live="polite">
      <blockquote>{quote.text}</blockquote>
      <figcaption>
        <a href={quote.sourceUrl}>{quote.author}</a>
      </figcaption>
    </figure>
  );
}
