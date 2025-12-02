import monolithLogo from "../../assets/monolith-logo.png";

type LoginPageProps = {
  onLogin: () => Promise<void> | void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">UCFR Desktop</p>
          <h1>Connect your desktop to UCFR</h1>
          <p className="sub">
            Sign in with your UCFR account to start tracking folders and syncing
            claims in the background.
          </p>
        </div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Authenticate</h2>
          <p>
            We&apos;ll open a secure browser window where you can complete the
            login. Once authorized, you&apos;ll be redirected back here.
          </p>
          <div className="row">
            <button onClick={onLogin}>Start login flow</button>
          </div>
        </div>

        <div className="card">
          <h2>About UCFR Desktop</h2>
          <p>
            UCFR Desktop runs quietly in the background, monitoring your chosen
            folders and sending updates to your UCFR workspace.
          </p>
          <p className="text-soft mono">
            Auto-start, tray controls, and real-time sync are enabled once
            you&apos;re signed in.
          </p>
        </div>
      </section>

      <div
        style={{
          position: "fixed",
          inset: "auto 24px 24px auto",
          opacity: 0.2,
        }}
      >
        <img
          src={monolithLogo}
          alt="Monolith logo"
          style={{ height: 40, width: "auto" }}
        />
      </div>
    </div>
  );
}


