import { useParams, Link } from "react-router-dom";
import type { Project } from "../../shared/api/types";
import { ProjectDetailPage } from "./ProjectDetail";
import { LayoutGrid, ExternalLink } from "lucide-react";

type ProjectsPageProps = {
  projects: Project[];
};

export function ProjectsPage({ projects }: ProjectsPageProps) {
  const { projectId } = useParams();
  const activeProject = projectId
    ? projects.find((p) => p.id === projectId) || null
    : null;

  if (activeProject) {
    return <ProjectDetailPage projects={projects} />;
  }

  // Shared empty/list container style
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full max-w-5xl mx-auto p-8 md:p-12">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <LayoutGrid className="w-6 h-6 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Projects
          </h1>
        </div>
        <p className="text-zinc-500 text-sm ml-11">
          {projects.length === 0
            ? "Projects will appear here once they're available in your workspace."
            : "Browse the projects that Monolith keeps in sync."}
        </p>
      </header>
      {children}
    </div>
  );

  if (projects.length === 0) {
    return (
      <Container>
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
          <p className="text-zinc-500 text-sm">No projects found.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="group relative flex flex-col gap-2 p-4 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-medium text-zinc-900 truncate pr-6">
              {project.name}
            </h3>
            {/* Claims count removed as it is not available in Project type */}
            {/*
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-zinc-100 font-medium text-zinc-700">
                {project.claims}
              </span>
              <span>{project.claims === 1 ? "claim" : "claims"}</span>
            </div>
            */}
            <div className="absolute top-4 right-4 text-zinc-300 group-hover:text-zinc-400 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </Container>
  );
}
