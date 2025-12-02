import { useState } from "react";
import { useAtom } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LayoutDashboard, FolderKanban, Settings } from "lucide-react";
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
import monolithLogo from "../assets/monolith-logo.png";
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
    const auth = (await window.ucfr.auth.startLoginFlow()) as {
      requestId: string;
    };
    const authUrl = `https://auth.ucfr.io/?request_id=${auth.requestId}`;

    await window.ucfr.app.openExternal(authUrl);
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
      <aside className="border-r border-[#e5e5e5] bg-[#09090b] p-0 flex flex-col">
        <div className="px-3 pb-6 text-[11px] tracking-[0.18em] uppercase text-[#71717a]">
          <div className="font-bold text-sm text-white tracking-[-0.02em] normal-case">
            <img src={monolithLogo} alt="Monolith" className="h-6" />
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <button
            className={`w-full rounded-md justify-start px-3 py-2 bg-transparent border-transparent shadow-none text-[#a1a1aa] transition-all duration-200 hover:bg-white/5 hover:text-[#e4e4e7] inline-flex items-center gap-1.5 ${
              activeView === "dashboard"
                ? "bg-[#27272a] text-white [&>svg]:text-white"
                : ""
            }`}
            onClick={() => setActiveView("dashboard")}
          >
            <LayoutDashboard
              className="text-[#71717a] group-hover:text-[#e4e4e7]"
              size={16}
            />
            <span>Dashboard</span>
          </button>

          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-[0.1em] text-[#52525b] px-3 pb-2 font-semibold">
              Projects
            </div>
            <button
              className={`w-full rounded-md justify-start px-3 py-2 bg-transparent border-transparent shadow-none text-[#a1a1aa] transition-all duration-200 hover:bg-white/5 hover:text-[#e4e4e7] inline-flex items-center gap-1.5 ${
                activeView === "projects" && !activeProjectId
                  ? "bg-[#27272a] text-white [&>svg]:text-white"
                  : ""
              }`}
              onClick={() => {
                setActiveView("projects");
                setActiveProjectId(null);
              }}
            >
              <FolderKanban
                className="text-[#71717a] group-hover:text-[#e4e4e7]"
                size={16}
              />
              <span>All projects</span>
            </button>
            <div className="mt-1 pl-0 flex flex-col gap-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={`rounded-md py-1.5 px-3 text-[13px] pl-9 w-full justify-start bg-transparent border-transparent shadow-none text-[#a1a1aa] transition-all duration-200 hover:bg-white/5 hover:text-[#e4e4e7] ${
                    activeView === "projects" && activeProjectId === project.id
                      ? "bg-[#27272a] text-white"
                      : ""
                  }`}
                  onClick={() => {
                    setActiveView("projects");
                    setActiveProjectId(project.id);
                  }}
                >
                  <span>{project.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-[#27272a]">
          <button
            className={`w-full rounded-md justify-start px-3 py-2 bg-transparent border-transparent shadow-none text-[#a1a1aa] transition-all duration-200 hover:bg-white/5 hover:text-[#e4e4e7] inline-flex items-center gap-1.5 ${
              activeView === "settings"
                ? "bg-[#27272a] text-white [&>svg]:text-white"
                : ""
            }`}
            onClick={() => setActiveView("settings")}
          >
            <Settings
              className="text-[#71717a] group-hover:text-[#e4e4e7]"
              size={16}
            />
            <span>Settings</span>
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
