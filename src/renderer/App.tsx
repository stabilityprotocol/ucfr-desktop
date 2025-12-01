import { useAtom } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBootstrap } from './hooks/useApi';
import { tokenAtom, folderAtom, autoStartAtom, projectsAtom, healthAtom, currentUserAtom } from './state';
import './style.css';

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
    const auth = await window.ucfr.auth.startLoginFlow();
    const token = (auth as any).token ?? (await window.ucfr.auth.getToken());
    setToken(token);
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

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">UCFR Desktop (mocked)</p>
          <h1>Welcome {currentUser?.name ?? 'Guest'}</h1>
          <p className="sub">Health: {health?.status ?? 'unknown'} ({health?.version ?? 'n/a'})</p>
        </div>
        <div className="auth">
          {token ? (
            <>
              <span className="pill">Token ready</span>
              <button onClick={logout}>Sign out</button>
            </>
          ) : (
            <button onClick={login}>Start login flow</button>
          )}
        </div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Watched folder</h2>
          <p>{folder ?? 'No folder selected yet.'}</p>
          <div className="row">
            <button onClick={selectFolder}>Choose folder</button>
            {folder && <button onClick={() => window.ucfr.sync.startWatcher(folder)}>Start watcher</button>}
          </div>
        </div>

        <div className="card">
          <h2>Startup</h2>
          <p>Auto-start at login is {autoStart ? 'enabled' : 'disabled'}.</p>
          <button onClick={toggleAutoStart}>{autoStart ? 'Disable' : 'Enable'} auto-start</button>
        </div>

        <div className="card">
          <h2>Projects</h2>
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                <strong>{project.name}</strong> · {project.claims} claims
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
