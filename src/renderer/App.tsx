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
    const authUrl = `https://auth.stabilityprotocol.com/?request_id=${auth.requestId}`;

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
    <div className="window">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <span className="sidebar-app-name">Monolith</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-item ${
                activeView === "dashboard" ? "is-active" : ""
              }`}
              onClick={() => setActiveView("dashboard")}
            >
              <LayoutDashboard className="sidebar-icon" size={16} />
              <span>Dashboard</span>
            </button>

            <div className="sidebar-section">
              <div className="sidebar-section-label">Projects</div>
              <button
                className={`sidebar-item ${
                  activeView === "projects" && !activeProjectId
                    ? "is-active"
                    : ""
                }`}
                onClick={() => {
                  setActiveView("projects");
                  setActiveProjectId(null);
                }}
              >
                <FolderKanban className="sidebar-icon" size={16} />
                <span>All projects</span>
              </button>
              <div className="sidebar-subitems">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className={`sidebar-item sidebar-item-nested ${
                      activeView === "projects" &&
                      activeProjectId === project.id
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveView("projects");
                      setActiveProjectId(project.id);
                    }}
                  >
                    <span className="sidebar-bullet" />
                    <span className="sidebar-project-name">{project.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          <div className="sidebar-footer">
            <button
              className={`sidebar-item ${
                activeView === "settings" ? "is-active" : ""
              }`}
              onClick={() => setActiveView("settings")}
            >
              <Settings className="sidebar-icon" size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
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
