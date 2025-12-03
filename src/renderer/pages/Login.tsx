import monolithLogo from "../../assets/monolith-logo.png";

type LoginPageProps = {
  onLogin: () => Promise<void> | void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="h-full flex items-center justify-center bg-zinc-50">
      <div className="max-w-[480px] w-full flex flex-col gap-8 text-center m-auto px-4">
        <header className="flex flex-col items-center gap-4 m-0">
          <img src={monolithLogo} alt="Monolith" className="h-12 w-auto mb-2" />
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Connect your desktop to Monolith
          </h1>
          <p className="text-sm text-zinc-500 max-w-[360px] mx-auto">
            Sign in with your Monolith account to start tracking folders and
            syncing claims in the background.
          </p>
        </header>

        <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm text-left">
          <h2 className="mb-2 text-xs font-semibold tracking-wider uppercase text-zinc-500">
            Authenticate
          </h2>
          <p className="mb-6 text-sm text-zinc-900 text-center">
            We&apos;ll open a secure browser window where you can complete the
            login. Once authorized, you&apos;ll be redirected back here.
          </p>
          <div className="flex justify-center">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 w-full sm:w-auto min-w-[120px]"
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
