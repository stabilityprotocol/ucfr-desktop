import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import type { MockProject } from "../../shared/api/types";
import { Folder, Plus, Trash2, Terminal } from "lucide-react";

type ProjectDetailProps = {
  projects: MockProject[];
};

export function ProjectDetailPage({ projects }: ProjectDetailProps) {
  const { projectId } = useParams();
  const project = projects.find((p) => p.id === projectId);

  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ event: string; file: string; time: string }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project) return;
    loadFolders();
    
    // Setup watcher listener
    let cleanup: (() => void) | undefined;
    if (window.ucfr?.sync?.onWatcherEvent) {
      cleanup = window.ucfr.sync.onWatcherEvent((payload: { event: string; file: string }) => {
        setLogs(prev => [...prev, { ...payload, time: new Date().toLocaleTimeString() }].slice(-100));
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [project?.id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const loadFolders = async () => {
    if (window.ucfr?.project && project) {
      const list = await window.ucfr.project.getFolders(project.id);
      setFolders(list);
    }
  };

  const handleAddFolder = async () => {
    if (window.ucfr?.project && project) {
      setLoading(true);
      const newList = await window.ucfr.project.addFolder(project.id);
      if (newList) setFolders(newList);
      setLoading(false);
    }
  };

  const handleRemoveFolder = async (path: string) => {
    if (window.ucfr?.project && project) {
      const newList = await window.ucfr.project.removeFolder(project.id, path);
      setFolders(newList);
    }
  };

  if (!project) {
     return (
       <div className="min-h-full flex flex-col items-center justify-center text-muted-foreground">
         Project not found
       </div>
     );
  }

  return (
    <div className="min-h-full flex flex-col items-stretch p-8 md:p-12 md:px-10 relative pb-64">
      <header className="max-w-[960px] w-full mx-auto mb-8 flex items-center justify-between gap-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-semibold m-0 mb-1.5">
            Project
          </p>
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px] text-foreground">
            {project.name}
          </h1>
          <p className="m-0 text-sm text-muted-foreground">
            {project.claims} claims synced
          </p>
        </div>
      </header>

      <div className="max-w-[960px] w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Watched Folders</h2>
          <button
            onClick={handleAddFolder}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus size={16} />
            Add Folder
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="bg-card border border-border rounded-[20px] p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-4 text-muted-foreground">
              <Folder size={24} />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">
              No folders watched
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a folder to start syncing files for this project.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((folder) => (
              <div
                key={folder}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-[20px] shadow-sm group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Folder size={20} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate font-mono">
                    {folder}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveFolder(folder)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Stop watching folder"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Console Component */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-green-400 font-mono text-xs p-4 h-48 border-t border-white/10 z-10 backdrop-blur-md flex flex-col">
        <div className="max-w-[960px] mx-auto w-full flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2 text-white/50 uppercase tracking-wider text-[10px] font-semibold shrink-0">
                <Terminal size={12} />
                Watcher Console
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {logs.length === 0 && <div className="text-white/30 italic">Waiting for file changes...</div>}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 hover:bg-white/5 p-0.5 rounded">
                        <span className="text-white/40 shrink-0">[{log.time}]</span>
                        <span className={`shrink-0 font-bold w-16 ${
                            log.event === 'add' ? 'text-green-400' : 
                            log.event === 'change' ? 'text-yellow-400' : 
                            log.event === 'unlink' ? 'text-red-400' : 'text-blue-400'
                        }`}>{log.event.toUpperCase()}</span>
                        <span className="break-all opacity-90">{log.file}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
      </div>
    </div>
  );
}

