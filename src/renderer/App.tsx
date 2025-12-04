import { useEffect } from "react";
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
} from "./state";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/Projects";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import { SettingsPage } from "./pages/Settings";
import { Layout } from "./components/Layout";
import "./style.css";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

function AppContent() {
  useBootstrap();
  const [token, setToken] = useAtom(tokenAtom);
  const [autoStart, setAutoStart] = useAtom(autoStartAtom);
  const [projects, setProjects] = useAtom(projectsAtom);
  const [health] = useAtom(healthAtom);
  const [currentUser] = useAtom(currentUserAtom);
  const [organizations] = useAtom(organizationsAtom);
  const [activeOrg, setActiveOrg] = useAtom(activeOrgAtom);

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
            />
          }
        />
        {/* Redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
