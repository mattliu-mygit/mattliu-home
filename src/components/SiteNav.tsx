import type { Ref } from "react";

import { ExternalLink } from "./ExternalLink";

type ProfileLink = {
  label: string;
  url: string;
};

type SiteNavProps = {
  immersive: boolean;
  immersiveButtonRef?: Ref<HTMLButtonElement>;
  links: readonly ProfileLink[];
  name: string;
  onToggleImmersive: () => void;
  showIdentity: boolean;
};

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.88c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.82a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M6.5 8.25H3.25V21H6.5V8.25Zm.2-4A1.9 1.9 0 1 0 2.9 4.25a1.9 1.9 0 0 0 3.8 0ZM21 13.7c0-3.84-2.05-5.63-4.78-5.63a4.12 4.12 0 0 0-3.72 2.05V8.25H9.25V21h3.25v-6.31c0-1.66.31-3.26 2.37-3.26 2.03 0 2.05 1.9 2.05 3.37V21H21v-7.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

const iconFor = (label: string) =>
  label === "GitHub" ? <GitHubIcon /> : <LinkedInIcon />;

function ImmersiveIcon({ active }: { active: boolean }) {
  return (
    <span aria-hidden="true" className="site-nav__immersive-glyph">
      <svg className="site-nav__immersive-frame" viewBox="0 0 24 24">
        <path
          d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
      {active ? (
        <svg className="site-nav__immersive-star" viewBox="0 0 24 24">
          <path
            d="M12 3.5c.45 5.63 2.87 8.05 8.5 8.5-5.63.45-8.05 2.87-8.5 8.5-.45-5.63-2.87-8.05-8.5-8.5 5.63-.45 8.05-2.87 8.5-8.5Z"
            fill="currentColor"
          />
        </svg>
      ) : null}
    </span>
  );
}

export function SiteNav({
  immersive,
  immersiveButtonRef,
  links,
  name,
  onToggleImmersive,
  showIdentity,
}: SiteNavProps) {
  return (
    <nav className="site-nav" aria-label="Profile links">
      <span
        aria-hidden={showIdentity && !immersive ? undefined : true}
        className="site-nav__identity"
        data-visible={showIdentity && !immersive ? "true" : undefined}
      >
        {name}
      </span>
      <div className="site-nav__links">
        <button
          aria-label={
            immersive ? "Exit immersive view" : "Enter immersive view"
          }
          className="site-nav__immersive"
          data-active={immersive ? "true" : undefined}
          onClick={onToggleImmersive}
          ref={immersiveButtonRef}
          type="button"
        >
          <ImmersiveIcon active={immersive} />
        </button>
        {links.map((link) => (
          <ExternalLink
            aria-label={link.label}
            className="site-nav__icon-link"
            href={link.url}
            key={link.label}
          >
            {iconFor(link.label)}
          </ExternalLink>
        ))}
      </div>
    </nav>
  );
}
