import type { MockProject } from "../../shared/api/types";

type ProjectsPageProps = {
  projects: MockProject[];
  activeProject: MockProject | null;
};

export function ProjectsPage({
  projects,
  activeProject,
}: ProjectsPageProps) {
  if (projects.length === 0) {
    return (
      <div className="app-shell">
        <header>
          <div>
            <p className="eyebrow">Projects</p>
            <h1>No projects yet</h1>
            <p className="sub">
              Projects will appear here once they&apos;re available in your
              UCFR workspace.
            </p>
          </div>
        </header>
      </div>
    );
  }

  if (activeProject) {
    return (
      <div className="app-shell">
        <header>
          <div>
            <p className="eyebrow">Projects</p>
            <h1>{activeProject.name}</h1>
            <p className="sub">
              This project has {activeProject.claims} claims synced from your
              watched folders.
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">Projects</p>
          <h1>All projects</h1>
          <p className="sub">Browse the projects that Monolith keeps in sync.</p>
        </div>
      </header>
    </div>
  );
}


