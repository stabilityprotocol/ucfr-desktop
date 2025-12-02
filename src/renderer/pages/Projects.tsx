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
      <div className="min-h-full flex flex-col items-stretch justify-center p-8 md:p-12 md:px-10">
        <header className="max-w-[960px] w-full mx-auto mb-6 flex items-center justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#a1a1aa] font-semibold m-0 mb-1.5">Projects</p>
            <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px]">No projects yet</h1>
            <p className="m-0 text-sm text-[#71717a]">
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
      <div className="min-h-full flex flex-col items-stretch justify-center p-8 md:p-12 md:px-10">
        <header className="max-w-[960px] w-full mx-auto mb-6 flex items-center justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#a1a1aa] font-semibold m-0 mb-1.5">Projects</p>
            <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px]">{activeProject.name}</h1>
            <p className="m-0 text-sm text-[#71717a]">
              This project has {activeProject.claims} claims synced from your
              watched folders.
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-stretch justify-center p-8 md:p-12 md:px-10">
      <header className="max-w-[960px] w-full mx-auto mb-6 flex items-center justify-between gap-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#a1a1aa] font-semibold m-0 mb-1.5">Projects</p>
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px]">All projects</h1>
          <p className="m-0 text-sm text-[#71717a]">Browse the projects that Monolith keeps in sync.</p>
        </div>
      </header>
    </div>
  );
}


