import { useEffect, useRef, useState } from "react";

import { AmbientStars } from "./components/AmbientStars";
import { Constellation } from "./components/Constellation";
import { ProjectLens } from "./components/ProjectLens";
import { projectBySlug, projects } from "./projects";

export default function App() {
  const [selectedSlug, setSelectedSlug] = useState(() => {
    const slug = window.location.hash.slice(1);
    return projectBySlug(slug)?.slug ?? null;
  });
  const lastTrigger = useRef<HTMLElement | null>(null);
  const selectedProject = selectedSlug
    ? projectBySlug(selectedSlug)
    : undefined;

  useEffect(() => {
    const syncSelection = () => {
      const slug = window.location.hash.slice(1);
      setSelectedSlug(projectBySlug(slug)?.slug ?? null);
    };
    window.addEventListener("hashchange", syncSelection);
    window.addEventListener("popstate", syncSelection);
    return () => {
      window.removeEventListener("hashchange", syncSelection);
      window.removeEventListener("popstate", syncSelection);
    };
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeProject();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  });

  const openProject = (slug: string) => {
    lastTrigger.current = document.activeElement as HTMLElement | null;
    setSelectedSlug(slug);
    window.history.pushState(null, "", `#${slug}`);
  };

  const closeProject = () => {
    setSelectedSlug(null);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    queueMicrotask(() => lastTrigger.current?.focus());
  };

  return (
    <main className="universe">
      <AmbientStars />

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="site-nav__name" href="/" aria-label="Matthew Liu home">
          Matthew Liu
        </a>
        <div className="site-nav__links">
          <a href="https://github.com/mattliu-mygit">GitHub</a>
          <a href="https://www.linkedin.com/in/mattliuhew/">LinkedIn</a>
          <a href="mailto:matthewliuhew@gmail.com">Email</a>
        </div>
      </nav>

      <header className="quiet-zone">
        <p className="eyebrow">Software engineer · Seattle</p>
        <h1>
          Software should
          <br />
          <em>show its work.</em>
        </h1>
        <p className="introduction">
          I build tools that help people inspect, evaluate, and improve
          intelligent systems.
        </p>
        <p className="quiet-zone__hint">Choose a constellation to explore.</p>
      </header>

      <section className="project-sky" aria-label="Selected work">
        {projects.map((project) => (
          <Constellation
            key={project.slug}
            project={project}
            onSelect={openProject}
          />
        ))}
      </section>

      {selectedProject ? (
        <ProjectLens project={selectedProject} onClose={closeProject} />
      ) : null}
    </main>
  );
}
