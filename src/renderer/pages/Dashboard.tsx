import { useEffect, useMemo, useState } from "react";
import type { Health, Project } from "../../shared/api/types";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
} from "lucide-react";
import { ArtifactCard } from "../components/ArtifactCard";
import {
  getDashboardUrl,
  getFingerprintVerifyUrl,
  openInWeb,
} from "../utils/webLinks";

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
  const [history, setHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const markNames = useMemo(
    () => new Map(marks.map((mark) => [mark.id, mark.name])),
    [marks],
  );

  useEffect(() => {
    setCurrentPage(1);
    void loadRecentActivity(1);
  }, [marks]);

  useEffect(() => {
    if (currentPage !== 1) return;
    const interval = setInterval(() => {
      void loadRecentActivity(1);
    }, 5_000);

    return () => clearInterval(interval);
  }, [currentPage]);

  const loadRecentActivity = async (page: number = currentPage) => {
    if (!window.ucfr?.mark?.getRecentActivity) return;
    const result = await window.ucfr.mark.getRecentActivity(page, pageSize);
    setHistory(result.items);
    setTotalCount(result.total);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-zinc-900" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Recent Activity</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-11">
            Latest artifacts captured from your local database, {currentUser ?? "Guest"}.
          </p>
        </div>
        <button
          onClick={() => openInWeb(getDashboardUrl())}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-colors border border-zinc-200"
          title="Open Dashboard in Web App"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open in Web</span>
        </button>
      </header>

      <div className="grid gap-6">
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-medium text-zinc-900">Recent Artifacts</h2>
            </div>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
              {totalCount}
            </span>
          </div>

          <div className="p-6">
            {history.length === 0 ? (
              <div className="text-center py-12 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50">
                <p className="text-zinc-500 text-sm">
                  No recent activity recorded locally.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {history.map((item, index) => {
                    const eventType = String(item.eventType ?? item.event_type ?? "unknown");
                    const path = String(item.path ?? "");
                    const hash = String(item.hash ?? "");
                    const timestamp = String(item.timestamp ?? "0");
                    const markId = typeof item.markId === "string" ? item.markId : null;
                    const markName = markId ? markNames.get(markId) : null;

                    return (
                      <ArtifactCard
                        key={item.id ?? index}
                        path={path}
                        eventType={eventType}
                        timestamp={timestamp}
                        hash={hash}
                        markName={markName ?? "Unmapped Mark"}
                        onClick={() => hash && openInWeb(getFingerprintVerifyUrl(hash))}
                      />
                    );
                  })}
                </div>

                {totalCount > pageSize && (
                  <div
                    className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100"
                  >
                    <div className="text-xs text-zinc-500">
                      Showing {(currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newPage = currentPage - 1;
                          setCurrentPage(newPage);
                          void loadRecentActivity(newPage);
                        }}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </button>
                      <span className="text-xs font-medium text-zinc-600 px-2">
                        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                      </span>
                      <button
                        onClick={() => {
                          const newPage = currentPage + 1;
                          setCurrentPage(newPage);
                          void loadRecentActivity(newPage);
                        }}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
