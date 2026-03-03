import { autoUpdater, UpdateInfo, ProgressInfo } from "electron-updater";
import { BrowserWindow, app } from "electron";

/** How long to wait after app ready before the first check (ms) */
const INITIAL_DELAY_MS = 30_000;
/** Interval between periodic checks (ms) — 4 hours */
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
/** Where users can download a fresh installer for major updates */
const RELEASES_URL = "https://github.com/stabilityprotocol/ucfr-desktop/releases/latest";

let checkInterval: ReturnType<typeof setInterval> | null = null;

export type UpdateStatus =
  | { type: "checking" }
  | { type: "available"; version: string; releaseNotes?: string }
  | { type: "major-available"; version: string; downloadUrl: string }
  | { type: "not-available" }
  | { type: "downloading"; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { type: "downloaded"; version: string; releaseNotes?: string }
  | { type: "error"; message: string };

function sendStatusToRenderer(status: UpdateStatus) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("update:status", status);
  });
}

/**
 * Returns true when the remote version has a higher major number than the
 * currently running app (e.g. 1.x.x → 2.0.0). Major updates require a
 * fresh download because they may change the installer format or include
 * breaking changes that the differential updater cannot apply.
 */
function isMajorUpdate(current: string, next: string): boolean {
  const currentMajor = parseInt(current.split(".")[0], 10);
  const nextMajor = parseInt(next.split(".")[0], 10);
  return !isNaN(currentMajor) && !isNaN(nextMajor) && nextMajor > currentMajor;
}

function extractReleaseNotes(info: UpdateInfo): string | undefined {
  if (!info.releaseNotes) return undefined;
  if (typeof info.releaseNotes === "string") return info.releaseNotes;
  // Array of { version, note } objects
  if (Array.isArray(info.releaseNotes)) {
    return info.releaseNotes.map((n) => n.note).join("\n");
  }
  return undefined;
}

/**
 * Initialise the auto-updater.
 * Call once from `app.whenReady()` — skips entirely in dev mode.
 */
export function initAutoUpdater() {
  if (!app.isPackaged) {
    console.log("[autoUpdater] Skipping — app is not packaged (dev mode)");
    return;
  }

  // ─── Configuration ───────────────────────────────────────────────
  // Auto-download is disabled so we can intercept major updates and
  // redirect the user to download a fresh installer instead.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  // ─── Events ──────────────────────────────────────────────────────
  autoUpdater.on("checking-for-update", () => {
    console.log("[autoUpdater] Checking for update…");
    sendStatusToRenderer({ type: "checking" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    const currentVersion = app.getVersion();
    console.log(`[autoUpdater] Update available: ${info.version} (current: ${currentVersion})`);

    if (isMajorUpdate(currentVersion, info.version)) {
      // Major updates require a fresh download — don't auto-download.
      console.log("[autoUpdater] Major update detected — prompting user to download manually");
      sendStatusToRenderer({
        type: "major-available",
        version: info.version,
        downloadUrl: RELEASES_URL,
      });
    } else {
      // Minor / patch — download in the background.
      sendStatusToRenderer({
        type: "available",
        version: info.version,
        releaseNotes: extractReleaseNotes(info),
      });
      autoUpdater.downloadUpdate().catch((err) => {
        console.error("[autoUpdater] Download failed:", err);
      });
    }
  });

  autoUpdater.on("update-not-available", (_info: UpdateInfo) => {
    console.log("[autoUpdater] No update available");
    sendStatusToRenderer({ type: "not-available" });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    console.log(`[autoUpdater] Download progress: ${progress.percent.toFixed(1)}%`);
    sendStatusToRenderer({
      type: "downloading",
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    console.log(`[autoUpdater] Update downloaded: ${info.version}`);
    sendStatusToRenderer({
      type: "downloaded",
      version: info.version,
      releaseNotes: extractReleaseNotes(info),
    });
  });

  autoUpdater.on("error", (err: Error) => {
    console.error("[autoUpdater] Error:", err.message);
    sendStatusToRenderer({ type: "error", message: err.message });
  });

  // ─── Schedule checks ────────────────────────────────────────────
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[autoUpdater] Initial check failed:", err);
    });
  }, INITIAL_DELAY_MS);

  checkInterval = setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[autoUpdater] Periodic check failed:", err);
    });
  }, CHECK_INTERVAL_MS);
}

/** Manually trigger an update check (from IPC). */
export function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

/** Quit the app and install the downloaded update. */
export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}

/** Clean up interval on app quit. */
export function stopAutoUpdater() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
