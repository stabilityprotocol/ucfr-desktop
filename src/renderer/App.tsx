import { useState } from "react";
import { useAtom } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Settings, ChevronDown, User } from "lucide-react";
import { useBootstrap } from "./hooks/useApi";
import {
  tokenAtom,
  folderAtom,
  autoStartAtom,
  projectsAtom,
  healthAtom,
  currentUserAtom,
} from "./state";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/Projects";
import { SettingsPage } from "./pages/Settings";
import { isBrowserMode } from "./mockBrowserAPI";
import "./style.css";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}

function Shell() {
  useBootstrap();
  const [token, setToken] = useAtom(tokenAtom);
  const [folder, setFolder] = useAtom(folderAtom);
  const [autoStart, setAutoStart] = useAtom(autoStartAtom);
  const [projects] = useAtom(projectsAtom);
  const [health] = useAtom(healthAtom);
  const [currentUser] = useAtom(currentUserAtom);

  const [activeView, setActiveView] = useState<
    "dashboard" | "projects" | "settings"
  >("dashboard");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const login = async () => {
    if (!window.ucfr) {
      console.error("window.ucfr is not available.");
      return;
    }

    const auth = (await window.ucfr.auth.startLoginFlow()) as {
      requestId: string;
    };
    const authUrl = `https://auth.ucfr.io/?request_id=${auth.requestId}`;
    if (isBrowserMode()) {
      console.log("🔗 Auth URL:", authUrl);
    } else {
      await window.ucfr.app.openExternal(authUrl);
    }
  };

  const logout = async () => {
    await window.ucfr.auth.clearToken();
    setToken(null);
  };

  const selectFolder = async () => {
    const chosen = await window.ucfr.settings.selectFolder();
    if (chosen) setFolder(chosen);
  };

  const toggleAutoStart = async () => {
    const next = await window.ucfr.app.toggleAutoStart(!autoStart);
    setAutoStart(next);
  };

  const startWatcher = async (targetFolder: string) => {
    await window.ucfr.sync.startWatcher(targetFolder);
  };

  if (!token) {
    return <LoginPage onLogin={login} />;
  }

  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null;

  return (
    <div className="h-full grid grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-r border-gray-200 bg-white p-0 flex flex-col h-full">
        {/* Logo Area */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 bg-black rounded-sm"></div>
            <span className="font-bold text-xl tracking-wide text-black">
              MONOLITH
            </span>
          </div>
        </div>

        {/* Project Selector */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-sm cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-1 rounded-full">
                <User size={14} className="text-gray-600" />
              </div>
              <span className="font-semibold text-sm text-gray-900 uppercase tracking-wide">
                Personal Projects
              </span>
            </div>
            <ChevronDown
              size={14}
              className="text-gray-400 group-hover:text-gray-600"
            />
          </div>
        </div>

        <nav className="flex flex-col flex-1 px-4 space-y-8">
          {/* Dashboard Link */}
          <div>
            <button
              className={`w-full text-left text-sm font-medium hover:text-black transition-colors uppercase tracking-wide ${
                activeView === "dashboard"
                  ? "text-black font-bold"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveView("dashboard")}
            >
              Dashboard
            </button>
          </div>

          {/* Projects Section */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">
              Projects
            </div>
            <div className="flex flex-col gap-3">
              <button
                className={`w-full text-left text-sm font-medium hover:text-black transition-colors uppercase tracking-wide ${
                  activeView === "projects" && !activeProjectId
                    ? "text-black font-bold"
                    : "text-gray-500"
                }`}
                onClick={() => {
                  setActiveView("projects");
                  setActiveProjectId(null);
                }}
              >
                All projects
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  className={`w-full text-left text-sm font-medium hover:text-black transition-colors uppercase tracking-wide truncate ${
                    activeView === "projects" && activeProjectId === p.id
                      ? "text-black font-bold"
                      : "text-gray-500"
                  }`}
                  onClick={() => {
                    setActiveView("projects");
                    setActiveProjectId(p.id);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom Settings */}
        <div className="p-4 mt-auto border-t border-gray-100">
          <button
            onClick={() => setActiveView("settings")}
            className={`w-full text-left text-sm font-medium hover:text-black transition-colors uppercase tracking-wide flex items-center gap-2 ${
              activeView === "settings"
                ? "text-black font-bold"
                : "text-gray-500"
            }`}
          >
            <Settings size={16} /> Settings
          </button>
        </div>
      </aside>

      <main className="min-h-full">
        {activeView === "dashboard" && (
          <DashboardPage
            currentUser={currentUser}
            health={health}
            folder={folder}
            autoStart={autoStart}
            projects={projects}
            onSelectFolder={selectFolder}
            onToggleAutoStart={toggleAutoStart}
            onStartWatcher={startWatcher}
          />
        )}

        {activeView === "projects" && (
          <ProjectsPage activeProject={activeProject} projects={projects} />
        )}

        {activeView === "settings" && (
          <SettingsPage
            folder={folder}
            autoStart={autoStart}
            onSelectFolder={selectFolder}
            onToggleAutoStart={toggleAutoStart}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  );
}
