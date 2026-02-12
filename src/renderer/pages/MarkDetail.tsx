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
  FileText,
} from "lucide-react";
import {
  getFingerprintVerifyUrl,
  getMarkUrl,
  openInWeb,
} from "../utils/webLinks";

type HistoryItem = {
  id: number;
  path: string;
  event_type: string;
  timestamp: string;
  hash: string;
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

  useEffect(() => {
    if (!mark) return;
    loadFolders();
    loadHistory();

    const interval = setInterval(() => {
      loadHistory();
    }, 5_000);

    return () => clearInterval(interval);
  }, [mark?.id]);

  const loadFolders = async () => {
    if (window.ucfr?.mark && mark) {
      const list = await window.ucfr.mark.getFolders(mark.id);
      setFolders(list);
    }
  };

  const loadHistory = async () => {
    if (window.ucfr?.mark && mark) {
      const logs = await window.ucfr.mark.getHistory(mark.id);
      setHistory(Array.isArray(logs) ? logs : []);
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
        `Are you sure you want to stop watching this folder?\n\n${path}`
      )
    ) {
      return;
    }

    if (window.ucfr?.mark && mark) {
      const newList = await window.ucfr.mark.removeFolder(mark.id, path);
      setFolders(newList);
    }
  };

  const formatTime = (ts: string | number) => {
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleString();
  };

  const getFileName = (path: string) => {
    return path.split(/[/\\]/).pop() || path;
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-colors border border-zinc-200"
          title="Open in Web App"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">Open in Web</span>
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
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-md text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-900">Recent Artifacts</h2>
        </div>
        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No recent activity recorded locally.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-3 w-1/3">File</th>
                  <th className="px-6 py-3 w-1/6">Event</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3 font-mono text-xs">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((item, i) => (
                  <tr
                    key={item.id || i}
                    className="hover:bg-zinc-50/50 cursor-pointer"
                    onClick={() =>
                      openInWeb(getFingerprintVerifyUrl(item.hash))
                    }
                  >
                    <td className="px-6 py-3 font-medium text-zinc-700">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span
                          title={item.path}
                          className="truncate max-w-[200px] block"
                        >
                          {getFileName(item.path)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.event_type === "add"
                            ? "bg-green-100 text-green-700"
                            : item.event_type === "change"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.event_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-500 whitespace-nowrap">
                      {formatTime(item.timestamp)}
                    </td>
                    <td
                      className="px-6 py-3 text-zinc-400 font-mono text-xs truncate max-w-[100px]"
                      title={item.hash}
                    >
                      {item.hash?.substring(0, 10)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
