import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import type { Project } from "../../shared/api/types";
import {
  Folder,
  Plus,
  Trash2,
  ExternalLink,
  Box,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ArtifactCard } from "../components/ArtifactCard";
import {
  getFingerprintVerifyUrl,
  getMarkUrl,
  openInWeb,
} from "../utils/webLinks";

type HistoryItem = {
  id: number;
  path: string;
  eventType: string;
  timestamp: string;
  hash: string;
};

type RawHistoryItem = Partial<HistoryItem> & {
  event_type?: string;
};

type MarkDetailProps = {
  marks: Project[];
};

export function MarkDetailPage({ marks }: MarkDetailProps) {
  const { markId } = useParams();
  const mark = marks.find((p) => p.id === markId);

  const [folders, setFolders] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (!mark) return;
    loadFolders();
    loadHistory(1);
    setCurrentPage(1);
  }, [mark?.id]);

  useEffect(() => {
    if (!mark) return;

    const interval = setInterval(() => {
      if (currentPage === 1) {
        loadHistory(1);
      }
    }, 5_000);

    return () => clearInterval(interval);
  }, [mark?.id, currentPage]);

  const loadFolders = async () => {
    if (window.ucfr?.mark && mark) {
      const list = await window.ucfr.mark.getFolders(mark.id);
      setFolders(list);
    }
  };

  const loadHistory = async (page: number = currentPage) => {
    if (window.ucfr?.mark && mark) {
      const result = await window.ucfr.mark.getHistory(mark.id, page, pageSize);
      const normalizedItems: HistoryItem[] = (result.items as RawHistoryItem[]).map(
        (item, index) => ({
          id: item.id ?? index,
          path: item.path ?? "",
          eventType: item.eventType ?? item.event_type ?? "unknown",
          timestamp: String(item.timestamp ?? "0"),
          hash: item.hash ?? "",
        }),
      );
      setHistory(normalizedItems);
      setTotalCount(result.total);
    }
  };

  const handleAddFolder = async () => {
    if (window.ucfr?.mark && mark) {
      setLoading(true);
      const newList = await window.ucfr.mark.addFolder(mark.id);
      if (newList) setFolders(newList);
      setLoading(false);
    }
  };

  const handleRemoveFolder = async (path: string) => {
    if (
      !window.confirm(
        `Are you sure you want to stop watching this folder?\n\n${path}`,
      )
    ) {
      return;
    }

    if (window.ucfr?.mark && mark) {
      const newList = await window.ucfr.mark.removeFolder(mark.id, path);
      setFolders(newList);
    }
  };

  if (!mark) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-zinc-500">
        Mark not found
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <Box className="w-6 h-6 text-zinc-900" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {mark.name}
            </h1>
          </div>
        </div>
        <button
          onClick={() => openInWeb(getMarkUrl(mark.id))}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-colors border border-zinc-200"
          title="Open in Web App"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open in Web</span>
        </button>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-medium text-zinc-900">
              Watched Folders
            </h2>
          </div>
          <button
            onClick={handleAddFolder}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-md text-xs font-medium hover:bg-[#0070d4] transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Folder
          </button>
        </div>

        <div className="p-0">
          {folders.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 mb-4 text-zinc-400">
                <Folder className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-zinc-900 mb-1">
                No folders watched
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                Add a folder from your computer to start syncing files for this
                mark.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {folders.map((folder) => (
                <div
                  key={folder}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Folder className="w-5 h-5 text-zinc-400 shrink-0" />
                    <span className="text-sm text-zinc-700 truncate font-mono">
                      {folder}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFolder(folder)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    title="Stop watching folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-medium text-zinc-900">
              Recent Artifacts
            </h2>
          </div>
          {totalCount > 0 && (
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
              {totalCount}
            </span>
          )}
        </div>
        <div className="p-6">
          {history.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No recent activity recorded locally.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {history.map((item, i) => {
                  const eventType = String(item.eventType ?? "unknown");
                  const path = String(item.path ?? "");
                  const hash = String(item.hash ?? "");
                  const timestamp = String(item.timestamp ?? "0");

                  return (
                    <ArtifactCard
                      key={item.id || i}
                      path={path}
                      eventType={eventType}
                      timestamp={timestamp}
                      hash={hash}
                      onClick={() => hash && openInWeb(getFingerprintVerifyUrl(hash))}
                    />
                  );
                })}
              </div>

              {totalCount > pageSize && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100">
                  <div className="text-xs text-zinc-500">
                    Showing {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, totalCount)} of{" "}
                    {totalCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        loadHistory(newPage);
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
                        loadHistory(newPage);
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
  );
}
