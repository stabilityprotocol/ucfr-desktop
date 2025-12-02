import type { MockHealth, MockProject } from "../../shared/api/types";

type DashboardPageProps = {
  currentUser: string | null;
  health: MockHealth | null;
  folder?: string;
  autoStart: boolean;
  projects: MockProject[];
  onLogout: () => Promise<void> | void;
  onSelectFolder: () => Promise<void> | void;
  onToggleAutoStart: () => Promise<void> | void;
  onStartWatcher: (folder: string) => Promise<void> | void;
};

export function DashboardPage({
  currentUser,
  health,
  folder,
  autoStart,
  projects,
  onLogout,
  onSelectFolder,
  onToggleAutoStart,
  onStartWatcher,
}: DashboardPageProps) {
  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">UCFR Desktop</p>
          <h1>Welcome {currentUser ?? "Guest"}</h1>
          <p className="sub">
            Health: {health?.status ?? "unknown"}{" "}
            <span>
              · version {health?.version ?? "n/a"}
            </span>
          </p>
        </div>
        <div className="auth">
          <span className="pill">Token ready</span>
          <button onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Watched folder</h2>
          <p>{folder ?? "No folder selected yet."}</p>
          <div className="row">
            <button onClick={onSelectFolder}>Choose folder</button>
            {folder && (
              <button onClick={() => onStartWatcher(folder)}>
                Start watcher
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Startup</h2>
          <p>Auto-start at login is {autoStart ? "enabled" : "disabled"}.</p>
          <button onClick={onToggleAutoStart}>
            {autoStart ? "Disable" : "Enable"} auto-start
          </button>
        </div>

        <div className="card">
          <h2>Projects</h2>
          {projects.length === 0 ? (
            <p className="text-soft">No projects yet.</p>
          ) : (
            <ul>
              {projects.map((project) => (
                <li key={project.id}>
                  <strong>{project.name}</strong> · {project.claims} claims
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}


