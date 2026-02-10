import type { Health, Project } from "../../shared/api/types";
import { ExternalLink, LayoutDashboard } from "lucide-react";
import { getDashboardUrl, openInWeb } from "../utils/webLinks";
import { useNavigate } from "react-router-dom";

type DashboardPageProps = {
  currentUser: string | null;
  health: Health | null;
  marks: Project[];
};

export function DashboardPage({
  currentUser,
  health,
  marks,
}: DashboardPageProps) {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-5xl mx-auto p-8 md:p-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-zinc-900" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Dashboard
            </h1>
          </div>
          <p className="text-zinc-500 text-sm ml-11">
            Welcome back, {currentUser ?? "Guest"}.
          </p>
        </div>
        <button
          onClick={() => openInWeb(getDashboardUrl())}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-colors border border-zinc-200"
          title="Open Dashboard in Web App"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">Open in Web</span>
        </button>
      </header>

      <div className="grid gap-6">
        {/* Marks Card */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">Marks</h2>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
              {marks.length}
            </span>
          </div>

          <div className="p-6">
            {marks.length === 0 ? (
              <div className="text-center py-12 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50">
                <p className="text-zinc-500 text-sm">
                  No marks found linked to your account.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marks.map((mark) => (
                  <div
                    key={mark.id}
                    onClick={() => navigate(`/marks/${mark.id}`)}
                    className="group relative flex flex-col gap-2 p-4 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <h3 className="font-medium text-zinc-900 truncate pr-6">
                      {mark.name}
                    </h3>
                    <div className="absolute top-4 right-4 text-zinc-300 group-hover:text-zinc-400 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
