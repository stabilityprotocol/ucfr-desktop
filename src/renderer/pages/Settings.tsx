import { LogOut, Settings, ExternalLink } from "lucide-react";
import { getProfileSettingsUrl, openInWeb } from "../utils/webLinks";

type SettingsPageProps = {
  autoStart: boolean;
  onToggleAutoStart: () => Promise<void> | void;
  onLogout: () => Promise<void> | void;
  currentUser?: string | null;
};

export function SettingsPage({
  autoStart,
  onToggleAutoStart,
  onLogout,
  currentUser,
}: SettingsPageProps) {
  return (
    <div className="w-full max-w-3xl mx-auto p-8 md:p-12">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <Settings className="w-6 h-6 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Settings
          </h1>
        </div>
        <p className="text-zinc-500 text-sm ml-11">
          Manage your application preferences and account.
        </p>
      </header>

      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-sm font-medium text-zinc-900">Startup</h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Auto-start</p>
              <p className="text-sm text-zinc-500 mt-1">
                Automatically start Monolith when you log in.
              </p>
            </div>
            <button
              onClick={onToggleAutoStart}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${
                autoStart ? "bg-zinc-900" : "bg-zinc-200"
              }`}
              aria-pressed={autoStart}
              role="switch"
            >
              <span className="sr-only">Enable auto-start</span>
              <span
                className={`${
                  autoStart ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-sm font-medium text-zinc-900">Account</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900">Session</p>
                <p className="text-sm text-zinc-500 mt-1">
                  You are currently signed in to Monolith.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    openInWeb(getProfileSettingsUrl(currentUser || undefined))
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
