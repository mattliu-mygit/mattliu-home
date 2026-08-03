import { NarrativeWheel } from "./components/NarrativeWheel";
import { ProjectLens } from "./components/ProjectLens";
import { RouteRail } from "./components/RouteRail";
import { SiteNav } from "./components/SiteNav";
import type { UniverseView } from "./portfolio/navigation";
import { portfolioModel } from "./portfolio/portfolio-model";
import { usePortfolioController } from "./portfolio/use-portfolio-controller";
import { CelestialScene } from "./scene/CelestialScene";
import { ConstellationWorld } from "./scene/ConstellationWorld";

const {
  constellationItems,
  content: { destinations, person },
  destinationBySlug,
  storyBeats,
} = portfolioModel;

export default function App() {
  const { actions, refs, scene, state } = usePortfolioController();
  const {
    activateStoryBeat,
    closeProject,
    enterConstellation,
    finishCameraArrival,
    handleStoryBeat,
    onOpenSkyWheel,
    selectConstellationItem,
    selectRouteBeat,
    toggleImmersive,
    updateRouteProgress,
  } = actions;
  const {
    constellationWorldRef,
    immersiveButtonRef,
    routeRailRef,
    viewHeading,
    wheelRef,
  } = refs;
  const { constellationDirection, sceneCamera, sceneView } = scene;
  const {
    activeStoryId,
    immersive,
    initialStoryProgress,
    location,
    selectedProject,
    selections,
    showHeaderIdentity,
  } = state;
  const constellationView = location.view as Exclude<UniverseView, "universe">;

  return (
    <CelestialScene
      camera={sceneCamera}
      constellationDirection={constellationDirection}
      immersive={immersive}
      interactive={!selectedProject}
      onOpenSkyWheel={onOpenSkyWheel}
      view={sceneView}
    >
      <SiteNav
        email={person.email}
        immersive={immersive}
        immersiveButtonRef={immersiveButtonRef}
        links={person.links}
        name={person.name}
        onToggleImmersive={toggleImmersive}
        showIdentity={showHeaderIdentity}
      />

      <div className="universe-stage" data-view={location.view}>
        <NarrativeWheel
          activeId={activeStoryId}
          beats={storyBeats}
          onActivate={activateStoryBeat}
          onActiveBeat={handleStoryBeat}
          onProgressChange={updateRouteProgress}
          ref={wheelRef}
        />

        <section
          aria-label={location.view === "universe" ? "Universe" : undefined}
          aria-labelledby={
            location.view === "universe" ? undefined : "constellation-view-title"
          }
          className={
            location.view === "universe"
              ? "universe-overview"
              : `constellation-view constellation-view--${constellationView}`
          }
          role="region"
        >
          {location.view !== "universe" ? (
            <h2
              className="constellation-view__title"
              id="constellation-view-title"
              ref={viewHeading}
              tabIndex={-1}
            >
              {destinationBySlug[constellationView].label} constellation
            </h2>
          ) : null}
          <ConstellationWorld
            activeSlugs={selections}
            destinations={destinations}
            interactive={!immersive}
            items={constellationItems}
            onCameraSettled={finishCameraArrival}
            onEnter={enterConstellation}
            onSelect={selectConstellationItem}
            ref={constellationWorldRef}
            view={sceneView}
          />
        </section>
      </div>

      <RouteRail
        activeId={activeStoryId}
        beats={storyBeats}
        initialProgress={initialStoryProgress}
        onSelect={selectRouteBeat}
        ref={routeRailRef}
      />

      {selectedProject ? (
        <ProjectLens project={selectedProject} onClose={closeProject} />
      ) : null}
    </CelestialScene>
  );
}
