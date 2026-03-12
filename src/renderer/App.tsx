import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useBootstrap } from "./hooks/useApi";
import {
  tokenAtom,
  folderAtom,
  autoStartAtom,
  marksAtom,
  healthAtom,
  currentUserAtom,
  userProfileAtom,
  organizationsAtom,
  activeOrgAtom,
  isValidatingAtom,
} from "./state";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { MarksPage } from "./pages/Marks";
import { MarkDetailPage } from "./pages/MarkDetail";
import { SettingsPage } from "./pages/Settings";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/ToastProvider";
import type {
  Organization,
  ProjectWithClaimsCount,
} from "../shared/api/types";
import "./style.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 60000, // Auto-refetch every 1 minute
      refetchOnWindowFocus: true, // Refetch when window regains focus
    },
  },
});

/**
 * Loads marks for the current scope (organization or personal workspace).
 * When viewing an organization, fetches that org's marks.
 * Otherwise, fetches all marks the user has access to via GET /api/projects.
 * The API already returns all marks where the user is admin, member, or org member,
 * so no client-side deduplication of shared marks is needed.
 */
async function loadMarksForScope({
  activeOrg,
  currentUser,
}: {
  activeOrg: Organization | null;
  currentUser: string | null;
}): Promise<ProjectWithClaimsCount[]> {
  if (!currentUser) {
    return [];
  }

  if (activeOrg) {
    // Organization endpoint returns Project[] (without claimsCount); cast for
    // compatibility — the count will simply be undefined on org-scoped marks.
    return (await window.ucfr.api.organizationMarks(
      activeOrg.id,
    )) as ProjectWithClaimsCount[];
  }

  // GET /api/projects returns ProjectWithClaimsCount[].
  // When viewing the personal workspace, filter out organization-owned marks so
  // only personal (and shared personal) marks are shown.
  const allMarks =
    (await window.ucfr.api.marks()) as ProjectWithClaimsCount[];
  return allMarks.filter((m) => !m.organization);
}

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

function parseRouteFromAppUrl(target: string): string | null {
  try {
    const url = new URL(target);
    if (url.protocol !== "monolithbystability:") {
      return null;
    }

    if (url.hash.startsWith("#/")) {
      return `${url.hash.slice(1)}${url.search}`;
    }

    const parts = [url.host, url.pathname.replace(/^\/+/, "")]
      .filter(Boolean)
      .join("/");

    if (!parts) {
      return "/";
    }

    return `/${parts}${url.search}`;
  } catch (error) {
    console.error("Failed to parse app URL:", error);
    return null;
  }
}

function AppContent() {
  useBootstrap();
  const navigate = useNavigate();
  const [token, setToken] = useAtom(tokenAtom);
  const [isValidating] = useAtom(isValidatingAtom);
  const [autoStart, setAutoStart] = useAtom(autoStartAtom);
  const [marks, setMarks] = useAtom(marksAtom);
  const [health] = useAtom(healthAtom);
  const [currentUser] = useAtom(currentUserAtom);
  const [organizations] = useAtom(organizationsAtom);
  const [activeOrg, setActiveOrg] = useAtom(activeOrgAtom);
  const setFolder = useSetAtom(folderAtom);
  const setHealth = useSetAtom(healthAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setUserProfile = useSetAtom(userProfileAtom);
  const setOrganizations = useSetAtom(organizationsAtom);
  useEffect(() => {
    async function loadMarks() {
      if (!currentUser) return;

      try {
        const fetchedMarks = await loadMarksForScope({
          activeOrg,
          currentUser,
        });
        setMarks(fetchedMarks);
      } catch (error) {
        console.error("Failed to load marks:", error);
      }
    }

    loadMarks();
  }, [activeOrg, currentUser, setMarks]);

  useEffect(() => {
    if (!currentUser) return;

    const refreshMarks = async () => {
      try {
        const fetchedMarks = await loadMarksForScope({
          activeOrg,
          currentUser,
        });
        setMarks(fetchedMarks);
      } catch (error) {
        console.error("Failed to refresh marks:", error);
      }
    };

    const intervalId = setInterval(refreshMarks, 60000);

    return () => clearInterval(intervalId);
  }, [currentUser, activeOrg, setMarks]);

  useEffect(() => {
    const unsubscribe = window.ucfr.app.onOpenUrl((target) => {
      const nextRoute = parseRouteFromAppUrl(target);
      if (!nextRoute) {
        return;
      }

      navigate(nextRoute);
    });

    return unsubscribe;
  }, [navigate]);

  const login = async () => {
    if (!window.ucfr) {
      console.error("window.ucfr is not available.");
      return;
    }

    await window.ucfr.auth.startLoginFlow();
    const authUrl = `https://auth.stabilityprotocol.com/?redirect_to=monolithbystability://token`;
    await window.ucfr.app.openExternal(authUrl);
  };

  const logout = async () => {
    // Full logout: clear all backend state (token, settings, watcher, DB)
    await window.ucfr.auth.logout();

    // Reset all Jotai atoms to their defaults
    setToken(null);
    setMarks([]);
    setCurrentUser(null);
    setUserProfile(null);
    setOrganizations([]);
    setActiveOrg(null);
    setHealth(null);
    setFolder(undefined);
    setAutoStart(false);

    // Clear React Query cache
    queryClient.clear();
  };

  const toggleAutoStart = async () => {
    const next = await window.ucfr.app.toggleAutoStart(!autoStart);
    setAutoStart(next);
  };

  // Show loading screen while validating token against the server
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-zinc-200 border-t-accent rounded-full animate-spin" />
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
      <Route path="/" element={<Layout marks={marks} />}>
        <Route
          index
          element={
            <DashboardPage
              currentUser={currentUser}
              health={health}
              marks={marks}
            />
          }
        />
        <Route path="marks" element={<MarksPage marks={marks} />} />
        <Route
          path="marks/:markId"
          element={<MarkDetailPage marks={marks} />}
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
