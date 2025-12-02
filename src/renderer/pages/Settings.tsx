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
    <div className="min-h-full flex flex-col items-stretch justify-center p-8 md:p-12 md:px-10">
      <header className="max-w-[960px] w-full mx-auto mb-6 flex items-center justify-between gap-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#a1a1aa] font-semibold m-0 mb-1.5">
            Settings
          </p>
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em] m-0 mb-1 md:text-[40px]">
            App settings
          </h1>
          <p className="m-0 text-sm text-[#71717a]">
            Configure how Monolith behaves on your machine.
          </p>
        </div>
      </header>

      <section className="max-w-[960px] w-full mx-auto grid grid-cols-1 gap-3.5 md:min-[900px]:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] md:min-[900px]:items-start">
        <div className="relative bg-gradient-to-br from-white to-[#fafafa] rounded-[20px] p-5 border border-[rgba(24,24,27,0.06)] shadow-[0_24px_60px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-dashed before:border-[rgba(24,24,27,0.04)] before:pointer-events-none">
          <h2 className="m-0 mb-2 text-sm tracking-[0.18em] uppercase text-[#a1a1aa]">
            Watched folder
          </h2>
          <p className="m-0 mb-2.5 text-sm text-[#09090b]">
            {folder ?? "No folder selected yet."}
          </p>
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <button
              className="inline-flex items-center gap-2 rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              onClick={onSelectFolder}
            >
              Choose folder
            </button>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white to-[#fafafa] rounded-[20px] p-5 border border-[rgba(24,24,27,0.06)] shadow-[0_24px_60px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-dashed before:border-[rgba(24,24,27,0.04)] before:pointer-events-none">
          <h2 className="m-0 mb-2 text-sm tracking-[0.18em] uppercase text-[#a1a1aa]">
            Startup
          </h2>
          <p className="m-0 mb-2.5 text-sm text-[#09090b]">
            Auto-start at login is {autoStart ? "enabled" : "disabled"}.
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            onClick={onToggleAutoStart}
          >
            {autoStart ? "Disable" : "Enable"} auto-start
          </button>
        </div>

        <div className="relative bg-gradient-to-br from-white to-[#fafafa] rounded-[20px] p-5 border border-[rgba(24,24,27,0.06)] shadow-[0_24px_60px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-dashed before:border-[rgba(24,24,27,0.04)] before:pointer-events-none">
          <h2 className="m-0 mb-2 text-sm tracking-[0.18em] uppercase text-[#a1a1aa]">
            Session
          </h2>
          <p className="m-0 mb-2.5 text-sm text-[#09090b]">
            You&apos;re currently signed in to Monolith.
          </p>
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <button
              className="inline-flex items-center gap-2 rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              onClick={onLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
