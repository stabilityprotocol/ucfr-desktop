import { useEffect, useState, useCallback } from "react";

type UpdateStatus =
  | { type: "checking" }
  | { type: "available"; version: string; releaseNotes?: string }
  | { type: "major-available"; version: string; downloadUrl: string }
  | { type: "not-available" }
  | {
      type: "downloading";
      percent: number;
      bytesPerSecond: number;
      transferred: number;
      total: number;
    }
  | { type: "downloaded"; version: string; releaseNotes?: string }
  | { type: "error"; message: string };

type BannerState =
  | { kind: "hidden" }
  | { kind: "downloading"; percent: number }
  | { kind: "ready"; version: string }
  | { kind: "major"; version: string; downloadUrl: string }
  | { kind: "error"; message: string };

export function UpdateBanner() {
  const [state, setState] = useState<BannerState>({ kind: "hidden" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.ucfr?.update) return;

    const unsubscribe = window.ucfr.update.onStatus((status: UpdateStatus) => {
      setDismissed(false);

      switch (status.type) {
        case "downloading":
          setState({ kind: "downloading", percent: status.percent });
          break;
        case "downloaded":
          setState({ kind: "ready", version: status.version });
          break;
        case "error":
          // Only show error if we were already showing something
          setState((prev) =>
            prev.kind !== "hidden"
              ? { kind: "error", message: status.message }
              : prev,
          );
          break;
        case "not-available":
        case "checking":
          // Don't change visual state for these
          break;
        case "available":
          // Minor/patch — download starts automatically, we'll show progress once it begins
          break;
        case "major-available":
          setState({
            kind: "major",
            version: status.version,
            downloadUrl: status.downloadUrl,
          });
          break;
      }
    });

    return unsubscribe;
  }, []);

  const handleInstall = useCallback(() => {
    window.ucfr.update.install();
  }, []);

  const handleDownload = useCallback((url: string) => {
    window.ucfr.app.openExternal(url);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (dismissed || state.kind === "hidden") {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      {state.kind === "downloading" && (
        <div className="bg-accent/95 backdrop-blur-sm text-accent-foreground">
          {/* Progress bar */}
          <div className="h-[2px] bg-white/20">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${Math.round(state.percent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 animate-spin"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="28"
                  strokeDashoffset="8"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-xs font-medium">
                Downloading update... {Math.round(state.percent)}%
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/60 hover:text-white transition-colors p-0.5"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="bg-success/95 backdrop-blur-sm text-success-foreground">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 8.5l4 4 8-9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs font-medium">
                Version {state.version} is ready
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors"
              >
                Restart Now
              </button>
              <button
                onClick={handleDismiss}
                className="text-white/60 hover:text-white transition-colors p-0.5"
                aria-label="Dismiss"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {state.kind === "major" && (
        <div className="bg-accent/95 backdrop-blur-sm text-accent-foreground">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1l7 14H1L8 1z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 6v4M8 12v.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-xs font-medium">
                Monolith v{state.version} is available — download the latest
                version to update
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDownload(state.downloadUrl)}
                className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors"
              >
                Download
              </button>
              <button
                onClick={handleDismiss}
                className="text-white/60 hover:text-white transition-colors p-0.5"
                aria-label="Dismiss"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="bg-destructive/95 backdrop-blur-sm text-destructive-foreground">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-medium truncate">
              Update failed: {state.message}
            </span>
            <button
              onClick={handleDismiss}
              className="text-white/60 hover:text-white transition-colors p-0.5 shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
