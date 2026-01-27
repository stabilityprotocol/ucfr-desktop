import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useBootstrap } from "./hooks/useApi";
import {
  tokenAtom,
  autoStartAtom,
  projectsAtom,
  healthAtom,
  currentUserAtom,
  organizationsAtom,
  activeOrgAtom,
  isValidatingAtom,
} from "./state";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/Projects";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import { SettingsPage } from "./pages/Settings";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/ToastProvider";
import "./style.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 60000, // Auto-refetch every 1 minute
      refetchOnWindowFocus: true, // Refetch when window regains focus
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ToastProvider />
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

function AppContent() {
  useBootstrap();
  const [token, setToken] = useAtom(tokenAtom);
  const [isValidating] = useAtom(isValidatingAtom);
  const [autoStart, setAutoStart] = useAtom(autoStartAtom);
  const [projects, setProjects] = useAtom(projectsAtom);
  const [health] = useAtom(healthAtom);
  const [currentUser] = useAtom(currentUserAtom);
  const [organizations] = useAtom(organizationsAtom);
  const [activeOrg, setActiveOrg] = useAtom(activeOrgAtom);
  const [downloadsAttached, setDownloadsAttached] = useState(false);

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

  useEffect(() => {
    async function checkDownloadsAttachment() {
      if (token && currentUser) {
        const settings = (await window.ucfr.settings.get()) as any;
        const projectFolders = settings.projectFolders || {};
        const downloadsPath = await window.ucfr.app.getPath("downloads");

        // Check if downloads folder is attached to any project
        const isAttached = Object.values(projectFolders).some(
          (folders: any) => folders.includes(downloadsPath)
        );

        setDownloadsAttached(isAttached);
      }
    }
    checkDownloadsAttachment();
  }, [token, currentUser]);

  const login = async () => {
    if (!window.ucfr) {
      console.error("window.ucfr is not available.");
      return;
    }

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

  const toggleAutoStart = async () => {
    const next = await window.ucfr.app.toggleAutoStart(!autoStart);
    setAutoStart(next);
  };

  const handleAttachDownloadsFolder = async () => {
    try {
      const result = (await window.ucfr.auth.attachDownloadsFolder()) as any;
      if (result.attached) {
        setDownloadsAttached(true);
      }
    } catch (error) {
      console.error("Failed to attach downloads folder:", error);
    }
  };

  // Show loading screen while validating token against the server
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#ff5f00] rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 font-medium">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  // Auth decision: if no token, show login page
  if (!token) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout projects={projects} />}>
        <Route
          index
          element={
            <DashboardPage
              currentUser={currentUser}
              health={health}
              projects={projects}
            />
          }
        />
        <Route path="projects" element={<ProjectsPage projects={projects} />} />
        <Route
          path="projects/:projectId"
          element={<ProjectDetailPage projects={projects} />}
        />
        <Route
          path="settings"
          element={
            <SettingsPage
              autoStart={autoStart}
              onToggleAutoStart={toggleAutoStart}
              onLogout={logout}
              currentUser={currentUser}
              onAttachDownloadsFolder={handleAttachDownloadsFolder}
              downloadsAttached={downloadsAttached}
            />
          }
        />
        {/* Redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
