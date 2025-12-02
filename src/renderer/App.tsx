import { useAtom } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

  return (
    <DashboardPage
      currentUser={currentUser}
      health={health}
      folder={folder}
      autoStart={autoStart}
      projects={projects}
      onLogout={logout}
      onSelectFolder={selectFolder}
      onToggleAutoStart={toggleAutoStart}
      onStartWatcher={startWatcher}
    />
  );
}
