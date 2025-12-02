import monolithLogo from "../../assets/monolith-logo.png";

type LoginPageProps = {
  onLogin: () => Promise<void> | void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="h-full flex items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff_0,#e4e4e7_100%)]">
      <div className="max-w-[480px] w-full flex flex-col gap-8 text-center m-auto">
        <header className="flex flex-col items-center gap-4 m-0">
          <img src={monolithLogo} alt="Monolith" className="h-12 w-auto mb-2" />
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px]">
            Connect your desktop to Monolith
          </h1>
          <p className="m-0 text-sm text-[#71717a] max-w-[360px] m-auto">
            Sign in with your Monolith account to start tracking folders and
            syncing claims in the background.
          </p>
        </header>

        <div className="relative bg-white rounded-[20px] p-5 border border-[#e4e4e7] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] text-left">
          <h2 className="m-0 mb-2 text-sm tracking-[0.18em] uppercase text-[#a1a1aa]">
            Authenticate
          </h2>
          <p className="m-0 mb-2.5 text-sm text-[#09090b] text-center">
            We&apos;ll open a secure browser window where you can complete the
            login. Once authorized, you&apos;ll be redirected back here.
          </p>
          <div className="flex flex-wrap gap-2 items-center mt-6 justify-center">
            <button
              className="inline-flex items-center gap-2 rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 w-full justify-center"
              onClick={onLogin}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
