import { useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
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
import type { Organization, Project } from "../shared/api/types";
import "./style.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 60000, // Auto-refetch every 1 minute
      refetchOnWindowFocus: true, // Refetch when window regains focus
    },
  },
});

async function loadMarksForScope({
  activeOrg,
  currentUser,
  organizations,
}: {
  activeOrg: Organization | null;
  currentUser: string | null;
  organizations: Organization[];
}): Promise<Project[]> {
  if (!currentUser) {
    return [];
  }

  if (activeOrg) {
    return (await window.ucfr.api.organizationMarks(activeOrg.id)) as Project[];
  }

  const ownMarks = (await window.ucfr.api.userMarks(currentUser)) as Project[];
  const memberEmails = Array.from(
    new Set(
      organizations
        .flatMap((org) => org.members.map((member) => member.email))
        .filter((email) => email !== currentUser),
    ),
  );

  if (memberEmails.length === 0) {
    return ownMarks;
  }

  const sharedPersonalMarkResults = await Promise.allSettled(
    memberEmails.map(async (email) => {
      const memberMarks = (await window.ucfr.api.userMarks(email)) as Project[];
      return memberMarks.filter(
        (mark) =>
          !mark.organization?.id &&
          mark.adminEmail !== currentUser &&
          mark.members.includes(currentUser),
      );
    }),
  );

  const dedupedMarks = new Map<string, Project>();

  for (const mark of ownMarks) {
    if (!dedupedMarks.has(mark.id)) {
      dedupedMarks.set(mark.id, mark);
    }
  }

  for (const result of sharedPersonalMarkResults) {
    if (result.status !== "fulfilled") {
      continue;
    }

    for (const mark of result.value) {
      if (!dedupedMarks.has(mark.id)) {
        dedupedMarks.set(mark.id, mark);
      }
    }
  }

  return Array.from(dedupedMarks.values());
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

function AppContent() {
  useBootstrap();
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
  const [downloadsAttached, setDownloadsAttached] = useState(false);
  const [downloadsMarkName, setDownloadsMarkName] = useState<string | null>(
    null,
  );
  const [downloadsMarkId, setDownloadsMarkId] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarks() {
      if (!currentUser) return;

      try {
        const fetchedMarks = await loadMarksForScope({
          activeOrg,
          currentUser,
          organizations,
        });
        setMarks(fetchedMarks);
      } catch (error) {
        console.error("Failed to load marks:", error);
      }
    }

    loadMarks();
  }, [activeOrg, currentUser, organizations, setMarks]);

  useEffect(() => {
    if (!currentUser) return;

    const refreshMarks = async () => {
      try {
        const fetchedMarks = await loadMarksForScope({
          activeOrg,
          currentUser,
          organizations,
        });
        setMarks(fetchedMarks);
      } catch (error) {
        console.error("Failed to refresh marks:", error);
      }
    };

    const intervalId = setInterval(refreshMarks, 60000);

    return () => clearInterval(intervalId);
  }, [currentUser, activeOrg, organizations, setMarks]);

  useEffect(() => {
    async function checkDownloadsAttachment() {
      if (token && currentUser) {
        const markFolders = await window.ucfr.mark.getAllWatchedFolders();
        const downloadsPath = await window.ucfr.app.getPath("downloads");

        // Find which mark the downloads folder is attached to
        const attachedMarkId = Object.entries(markFolders).find(
          ([, folders]: [string, any]) => folders.includes(downloadsPath),
        )?.[0];

        setDownloadsAttached(!!attachedMarkId);
        setDownloadsMarkId(attachedMarkId ?? null);

        if (attachedMarkId && marks.length > 0) {
          const attachedMark = marks.find(
            (m: any) => m.id === attachedMarkId,
          );
          setDownloadsMarkName(attachedMark?.name ?? null);
        } else {
          setDownloadsMarkName(null);
        }
      }
    }
    checkDownloadsAttachment();
  }, [token, currentUser, marks]);

  const login = async () => {
    if (!window.ucfr) {
      console.error("window.ucfr is not available.");
      return;
    }

    const auth = (await window.ucfr.auth.startLoginFlow()) as {
      requestId: string;
    };
    const authUrl = `https://auth.stabilityprotocol.com/?request_id=${auth.requestId}`;
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
              onAttachDownloadsFolder={handleAttachDownloadsFolder}
              downloadsAttached={downloadsAttached}
              downloadsMarkName={downloadsMarkName}
              downloadsMarkId={downloadsMarkId}
            />
          }
        />
        {/* Redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
