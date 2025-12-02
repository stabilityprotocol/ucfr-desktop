import { useState, useEffect, useRef } from "react";
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
  organizationsAtom,
} from "./state";
import { Organization } from "../shared/api/types";
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
  const [projects, setProjects] = useAtom(projectsAtom);
  const [health] = useAtom(healthAtom);
  const [currentUser] = useAtom(currentUserAtom);
  const [organizations] = useAtom(organizationsAtom);

  const [activeView, setActiveView] = useState<
    "dashboard" | "projects" | "settings"
  >("dashboard");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isOrgSelectorOpen, setIsOrgSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOrgSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function loadProjects() {
      if (!currentUser) return;

      try {
        let fetchedProjects = [];
        if (activeOrg) {
          fetchedProjects = (await window.ucfr.api.organizationProjects(
            activeOrg.id
          )) as any[];
        } else {
          fetchedProjects = (await window.ucfr.api.userProjects(
            currentUser
          )) as any[];
        }
        setProjects(fetchedProjects as any);
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    }

    loadProjects();
  }, [activeOrg, currentUser, setProjects]);

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

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
        <div className="px-4 mb-6 relative" ref={dropdownRef}>
          <div
            onClick={() => setIsOrgSelectorOpen(!isOrgSelectorOpen)}
            className="flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-sm cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              {activeOrg ? (
                <div className="h-8 w-8 bg-black flex items-center justify-center rounded-sm flex-shrink-0">
                  <span className="text-white font-bold text-xs">
                    {getInitials(activeOrg.name)}
                  </span>
                </div>
              ) : (
                <div className="h-8 w-8 bg-gray-200 flex items-center justify-center rounded-sm flex-shrink-0">
                  <User size={16} className="text-gray-600" />
                </div>
              )}
              <span className="font-bold text-sm text-gray-900 uppercase tracking-wide truncate max-w-[140px]">
                {activeOrg ? activeOrg.name : "Personal Projects"}
              </span>
            </div>
            <ChevronDown
              size={14}
              className="text-gray-400 group-hover:text-gray-600"
            />
          </div>

          {isOrgSelectorOpen && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-50 max-h-80 overflow-y-auto py-2">
              <div
                className={`px-3 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                  !activeOrg ? "bg-gray-100" : ""
                }`}
                onClick={() => {
                  setActiveOrg(null);
                  setIsOrgSelectorOpen(false);
                }}
              >
                <div className="h-10 w-10 bg-gray-200 flex items-center justify-center rounded-sm flex-shrink-0">
                  <User size={20} className="text-gray-600" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
                    PERSONAL PROJECTS
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    Your own projects
                  </span>
                </div>
              </div>

              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`px-3 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                    activeOrg?.id === org.id ? "bg-gray-100" : ""
                  }`}
                  onClick={() => {
                    setActiveOrg(org);
                    setIsOrgSelectorOpen(false);
                  }}
                >
                  <div className="h-10 w-10 bg-black flex items-center justify-center rounded-sm flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {getInitials(org.name)}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
                    {org.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <nav className="flex flex-col flex-1 px-4 space-y-4">
          {/* Dashboard Link */}
          <div>
            <button
              className={`w-full text-left text-sm font-light transition-colors uppercase tracking-wide px-2 py-1.5 rounded-sm ${
                activeView === "dashboard"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-black hover:bg-gray-100"
              }`}
              onClick={() => setActiveView("dashboard")}
            >
              Dashboard
            </button>
          </div>

          {/* Projects Section */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 px-2">
              Projects
            </div>
            <div className="flex flex-col gap-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  className={`w-full text-left text-sm font-light transition-colors uppercase tracking-wide truncate px-3 py-1.5 rounded-sm ${
                    activeView === "projects" && activeProjectId === p.id
                      ? "bg-black text-white"
                      : "text-gray-500 hover:text-black hover:bg-gray-100"
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
