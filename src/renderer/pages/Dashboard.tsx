import type { MockHealth, MockProject } from "../../shared/api/types";

type DashboardPageProps = {
  currentUser: string | null;
  health: MockHealth | null;
  projects: MockProject[];
};

export function DashboardPage({
  currentUser,
  health,
  projects,
}: DashboardPageProps) {
  return (
    <div className="min-h-full flex flex-col items-stretch justify-start p-8 md:p-12 md:px-10">
      <header className="max-w-[960px] w-full mx-auto mb-8 flex items-center justify-between gap-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#a1a1aa] font-semibold m-0 mb-1.5">
            Monolith
          </p>
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px]">
            Welcome {currentUser ?? "Guest"}
          </h1>
          <p className="m-0 text-sm text-[#71717a]">
            Health: {health?.status ?? "unknown"}{" "}
            <span className="font-mono text-xs uppercase tracking-[0.12em]">
              · version {health?.version ?? "n/a"}
            </span>
          </p>
        </div>
      </header>

      <section className="max-w-[960px] w-full mx-auto">
        <div className="relative bg-white rounded-[20px] p-6 border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Projects
            </h2>
            <span className="text-sm text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full font-medium">
              {projects.length}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
              <p className="text-zinc-500 text-sm">No projects found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group relative bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="font-medium text-zinc-900 truncate pr-4">
                      {project.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {project.claims}{" "}
                      {project.claims === 1 ? "claim" : "claims"}
                    </p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-400"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
