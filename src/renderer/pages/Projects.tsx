import { useParams } from "react-router-dom";
import type { MockProject } from "../../shared/api/types";
import { ProjectDetailPage } from "./ProjectDetail";

type ProjectsPageProps = {
  projects: MockProject[];
};

export function ProjectsPage({
  projects,
}: ProjectsPageProps) {
  const { projectId } = useParams();
  const activeProject = projectId
    ? projects.find((p) => p.id === projectId) || null
    : null;

  if (projects.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-stretch justify-center p-8 md:p-12 md:px-10">
        <header className="max-w-[960px] w-full mx-auto mb-6 flex items-center justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-semibold m-0 mb-1.5">Projects</p>
            <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px] text-foreground">No projects yet</h1>
            <p className="m-0 text-sm text-muted-foreground">
              Projects will appear here once they&apos;re available in your
              UCFR workspace.
            </p>
          </div>
        </header>
      </div>
    );
  }

  if (activeProject) {
    // If routed here with projectId, delegate to ProjectDetailPage.
    // Though routing should ideally handle this, keeping it here allows
    // for shared logic if needed or handling direct mounting.
    // But actually, App.tsx defines routes.
    // If we keep <Route path="projects/:projectId" element={<ProjectsPage ... />} /> in App.tsx,
    // then this delegation is correct.
    return <ProjectDetailPage projects={projects} />;
  }

  return (
    <div className="min-h-full flex flex-col items-stretch justify-center p-8 md:p-12 md:px-10">
      <header className="max-w-[960px] w-full mx-auto mb-6 flex items-center justify-between gap-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-semibold m-0 mb-1.5">Projects</p>
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px] text-foreground">All projects</h1>
          <p className="m-0 text-sm text-muted-foreground">Browse the projects that Monolith keeps in sync.</p>
        </div>
      </header>
    </div>
  );
}
