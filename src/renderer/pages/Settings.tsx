type SettingsPageProps = {
  folder?: string;
  autoStart: boolean;
  onSelectFolder: () => Promise<void> | void;
  onToggleAutoStart: () => Promise<void> | void;
  onLogout: () => Promise<void> | void;
};

export function SettingsPage({
  folder,
  autoStart,
  onSelectFolder,
  onToggleAutoStart,
  onLogout,
}: SettingsPageProps) {
  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">Settings</p>
          <h1>App settings</h1>
          <p className="sub">Configure how Monolith behaves on your machine.</p>
        </div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Watched folder</h2>
          <p>{folder ?? "No folder selected yet."}</p>
          <div className="row">
            <button onClick={onSelectFolder}>Choose folder</button>
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
          <h2>Session</h2>
          <p>You&apos;re currently signed in to Monolith.</p>
          <div className="row">
            <button onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </section>
    </div>
  );
}
