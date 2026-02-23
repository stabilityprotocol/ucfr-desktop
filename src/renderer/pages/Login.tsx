type LoginPageProps = {
  onLogin: () => Promise<void> | void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="h-full flex items-center justify-center bg-stone-50">
      <div className="max-w-[480px] w-full flex flex-col gap-8 text-center m-auto px-4">
        <header className="flex flex-col items-center gap-4 m-0">
          <div className="mb-2 text-[38px] leading-none font-semibold tracking-tight text-zinc-800">
            Monolith
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Connect your desktop to Monolith
          </h1>
          <p className="text-sm text-zinc-600 max-w-[360px] mx-auto">
            Sign in with your Monolith account to start tracking folders and
            syncing artifacts in the background.
          </p>
        </header>

        <div className="bg-white rounded-lg p-6 border border-zinc-200 shadow-sm text-left">
          <h2 className="mb-2 text-xs font-semibold tracking-wider uppercase text-zinc-500">
            Authenticate
          </h2>
          <p className="mb-6 text-sm text-zinc-900 text-center">
            We&apos;ll open a secure browser window where you can complete the
            login. Once authorized, you&apos;ll be redirected back here.
          </p>
          <div className="flex justify-center">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0070d4] w-full sm:w-auto min-w-[140px]"
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
