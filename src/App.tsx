import { AmbientStars } from "./components/AmbientStars";
import { Constellation } from "./components/Constellation";
import { projects } from "./projects";

export default function App() {
  const openProject = () => undefined;

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
    </main>
  );
}
