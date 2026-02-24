import { app, dialog, ipcMain, shell, BrowserWindow } from "electron";
import { randomUUID } from "crypto";
import { tokenManager } from "./tokenStore";
import { getSettings, updateSettings, resetSettings } from "./settings";
import { FolderWatcher } from "./watcher";
import { handleFileChange } from "./artifactService";
import {
  fetchUserProfile,
  fetchUserMarks,
  fetchOrganizationMarks,
  TokenExpiredError,
} from "../shared/api/client";
import { initDb, dbExec, dbQuery, setCurrentUser, clearAllUserData, getAllWatchedFolders, addWatchedFolder, removeWatchedFolder, getWatchedFoldersForMark } from "./db";
import { fileHistoryService } from "./fileHistory";
import { decodeJwtPayload } from "../shared/api/auth";

let watcher: FolderWatcher | null = null;

// Debounce map: filePath -> timeout, to coalesce rapid add+change events
const pendingEvents = new Map<string, { event: string; timer: ReturnType<typeof setTimeout> }>();
// Sequential queue to ensure DB writes complete before processing next event
let eventQueue: Promise<void> = Promise.resolve();

// Helper function to send notifications to renderer process
function sendNotification(type: "success" | "error" | "info", message: string) {
  BrowserWindow.getAllWindows().forEach((win) =>
    win.webContents.send("notification", { type, message }),
  );
}

async function pollForToken(requestId: string): Promise<string | null> {
  const pollUrl = `https://auth.stabilityprotocol.com/v1/auth/poll/${requestId}`;
  // Poll for up to 5 minutes
  const maxAttempts = 150;
  const intervalMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(pollUrl);
      if (response.ok) {
        const data = (await response.json()) as { token: string };
        return data.token;
      } else if (response.status === 404) {
        // Token not ready, wait and retry
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } else {
        console.error("Auth polling failed:", response.statusText);
        return null;
      }
    } catch (err) {
      console.error("Auth polling error:", err);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return null;
}

async function getAuthorizedUserFromApi(): Promise<unknown | null> {
  const token = await tokenManager.getToken();
  if (!token) return null;

  try {
    const response = await fetch(
      "https://auth.stabilityprotocol.com/v1/auth/is-authorized",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 401) {
      await tokenManager.clear();
      return null;
    }

    if (!response.ok) {
      console.error("is-authorized failed:", response.statusText);
      return null;
    }

    const data = (await response.json()) as {
      ok: boolean;
      value?: {
        email: string;
        iat: number;
        exp: number;
      };
    };

    if (!data.ok) return null;
    return data.value?.email ?? null;
  } catch (err) {
    console.error("is-authorized error:", err);
    return null;
  }
}

function processEvent(file: string, event: string): void {
  // Enqueue so each event fully completes before the next starts
  eventQueue = eventQueue.then(async () => {
    try {
      // Track history first so DB has the record before artifact checks it
      await fileHistoryService.handleEvent(event, file);
      // Then trigger artifact creation (checks DB for existing hash)
      await handleFileChange(file, event);
    } catch (err) {
      console.error(`[Watcher] Error processing ${event} for ${file}:`, err);
    }
  });
}

function getOrCreateWatcher(): FolderWatcher {
  if (!watcher) {
    watcher = new FolderWatcher((payload) => {
      console.log("Sync event", payload);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("watcher-event", payload),
      );

      // Debounce: coalesce rapid add+change into a single event.
      // When a file is created, chokidar often fires `add` immediately followed by `change`
      // (once the file content is flushed to disk). The 500ms window ensures both events
      // are merged into a single `add`, even on slower storage or large file writes.
      const existing = pendingEvents.get(payload.file);
      if (existing) {
        clearTimeout(existing.timer);
      }
      
      // Keep the first event type (add takes priority over change)
      const eventType = existing ? existing.event : payload.event;
      
      const timer = setTimeout(() => {
        pendingEvents.delete(payload.file);
        processEvent(payload.file, eventType);
      }, 500);
      
      pendingEvents.set(payload.file, { event: eventType, timer });
    });
  }
  return watcher;
}

export async function registerIpcHandlers() {
  initDb();

  // Initialize watcher with existing folders from database
  // Note: This will be populated once a user logs in and setCurrentUser is called
  // The initial load happens in the tokenChanged handler or when folders are accessed

  ipcMain.handle("auth/getToken", async () => tokenManager.getToken());

  ipcMain.handle("auth/getUser", async () => {
    return getAuthorizedUserFromApi();
  });

  ipcMain.handle("auth/clearToken", async () => {
    await tokenManager.clear();
    return null;
  });

  /**
   * Full logout: clears token, resets settings, stops watcher, and wipes user data from DB.
   * Ensures the next user session starts completely fresh.
   */
  ipcMain.handle("auth/logout", async () => {
    // 1. Clear auth token
    await tokenManager.clear();

    // 2. Stop file watcher (was watching previous user's folders)
    if (watcher) {
      watcher.stop();
      watcher = null;
    }

    // 3. Clear any pending debounced file events
    for (const [, entry] of pendingEvents) {
      clearTimeout(entry.timer);
    }
    pendingEvents.clear();

    // 4. Reset settings to defaults (projectFolders, hasCompletedFirstLogin, etc.)
    resetSettings();

    // 5. Clear all user data from SQLite database
    await clearAllUserData();

    console.log("[auth/logout] Full logout completed — all user data cleared");
    return null;
  });

  /**
   * Validates the stored token against the auth server.
   * Returns { valid: true } if token is valid, { valid: false } otherwise.
   * Clears the token if server returns 401 (invalid/expired).
   * On network errors, returns { valid: true } to allow offline usage.
   */
  ipcMain.handle("auth/validateToken", async () => {
    const token = await tokenManager.getToken();
    if (!token) return { valid: false };

    try {
      const response = await fetch(
        "https://auth.stabilityprotocol.com/v1/auth/is-authorized",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 401) {
        await tokenManager.clear();
        return { valid: false };
      }

      if (!response.ok) {
        // Server error, allow offline usage
        console.warn(
          "[auth/validateToken] Validation failed (non-401), allowing offline:",
          response.status,
        );
        return { valid: true };
      }

      const data = (await response.json()) as { ok: boolean };
      return { valid: data.ok === true };
    } catch (err) {
      // Network error, allow offline usage
      console.warn(
        "[auth/validateToken] Network error, allowing offline:",
        err,
      );
      return { valid: true };
    }
  });

  ipcMain.handle("auth/startLoginFlow", async () => {
    const requestId = randomUUID();

    // Start polling in the background; when the token is ready, store it.
    void (async () => {
      console.log("[auth/startLoginFlow] Starting token polling for requestId:", requestId);
      const token = await pollForToken(requestId);
      console.log("[auth/startLoginFlow] Poll result:", token ? "token received" : "no token");
      if (token) {
        // Decode the JWT to extract user email BEFORE persisting the token.
        // After sign-out, currentUser is null — we need to re-establish it
        // from the JWT payload so tokenManager.setToken() can persist.
        const payload = decodeJwtPayload<Record<string, unknown>>(token);
        console.log("[auth/startLoginFlow] JWT payload keys:", Object.keys(payload ?? {}));
        console.log("[auth/startLoginFlow] JWT full payload:", payload);
        const email = typeof payload?.email === 'string' ? payload.email :
                      typeof payload?.sub === 'string' ? payload.sub :
                      typeof payload?.preferred_username === 'string' ? payload.preferred_username :
                      null;
        console.log("[auth/startLoginFlow] Extracted email:", email);
        if (email) {
          setCurrentUser(email);
          console.log("[auth/startLoginFlow] Session established for:", email);
        } else {
          console.warn("[auth/startLoginFlow] No email or sub found in JWT claims!");
        }

        console.log("[auth/startLoginFlow] About to persist token...");
        await tokenManager.setToken(token);
        console.log("[auth/startLoginFlow] Token persisted successfully");
        
        // Verify token was saved
        const verifyToken = await tokenManager.getToken();
        console.log("[auth/startLoginFlow] Token verification:", verifyToken ? "stored" : "NOT stored");
        
        // Notify all renderer windows that the token has changed
        console.log("[auth/startLoginFlow] Notifying renderer windows...");
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged"),
        );
        console.log("[auth/startLoginFlow] Token change notifications sent");
      } else {
        console.error("[auth/startLoginFlow] Authentication timed out or failed.");
      }
    })();

    return { requestId };
  });

  ipcMain.handle("settings/get", async () => getSettings());

  ipcMain.handle(
    "settings/set",
    async (_event, update: Partial<ReturnType<typeof getSettings>>) => {
      const next = updateSettings(update);
      return next;
    },
  );

  ipcMain.handle("folder/select", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (!result.canceled && result.filePaths.length) {
      const folderPath = result.filePaths[0];
      updateSettings({ folderPath });
      return folderPath;
    }
    return null;
  });

  ipcMain.handle("mark/addFolder", async (_event, markId: string) => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (!result.canceled && result.filePaths.length) {
      const folderPath = result.filePaths[0];
      const currentList = await getWatchedFoldersForMark(markId);

      if (!currentList.includes(folderPath)) {
        await addWatchedFolder(markId, folderPath);
        const newList = await getWatchedFoldersForMark(markId);

        const w = getOrCreateWatcher();
        w.add(folderPath);

        return newList;
      }
      return currentList;
    }
    return null;
  });

  ipcMain.handle(
    "mark/removeFolder",
    async (_event, markId: string, folderPath: string) => {
      await removeWatchedFolder(markId, folderPath);
      const newList = await getWatchedFoldersForMark(markId);
      if (watcher) {
        watcher.unwatch(folderPath);
      }
      return newList;
    },
  );

  ipcMain.handle("mark/getFolders", async (_event, markId: string) => {
    return await getWatchedFoldersForMark(markId);
  });

  ipcMain.handle("mark/getAllWatchedFolders", async () => {
    return await getAllWatchedFolders();
  });

  ipcMain.handle("mark/getHistory", async (_event, markId: string, page: number = 1, pageSize: number = 20) => {
    const folders = await getWatchedFoldersForMark(markId);
    return await fileHistoryService.getHistoryForFolders(folders, page, pageSize);
  });

  ipcMain.handle("mark/getRecentActivity", async (_event, page: number = 1, pageSize: number = 20) => {
    const markFolders = await getAllWatchedFolders();
    const folderEntries = Object.entries(markFolders)
      .flatMap(([markId, folders]) =>
        folders.map((folderPath) => ({ markId, folderPath })),
      )
      .sort((a, b) => b.folderPath.length - a.folderPath.length);

    if (folderEntries.length === 0) {
      return { items: [], total: 0 };
    }

    const folders = folderEntries.map((entry) => entry.folderPath);
    const result = await fileHistoryService.getHistoryForFolders(folders, page, pageSize);

    const items = (result.items as Array<Record<string, unknown>>).map((item) => {
      const filePath = typeof item.path === "string" ? item.path : "";
      const matchedEntry = folderEntries.find((entry) => filePath.startsWith(entry.folderPath));
      return {
        ...item,
        markId: matchedEntry?.markId ?? null,
      };
    });

    return { items, total: result.total };
  });

  ipcMain.handle("app/toggleAutoStart", async (_event, enable: boolean) => {
    updateSettings({ autoStart: enable });
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath,
      args: enable ? ["--hidden"] : [],
    });
    return enable;
  });

  ipcMain.handle("sync/startWatcher", async (_event, folderPath: string) => {
    const w = getOrCreateWatcher();
    w.start(folderPath);
    return true;
  });

  ipcMain.handle("api/marks", async () => {
    const token = await tokenManager.getToken();
    if (!token) return [];
    const email = (await getAuthorizedUserFromApi()) as string | null;
    if (!email) return [];
    try {
      return await fetchUserMarks(email, token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await tokenManager.clear();
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged"),
        );
        return [];
      }
      throw error;
    }
  });

  // Removing api/me as it was using mock and not used in core flow (auth/getUser is used).
  ipcMain.handle("api/me", async () => null);

  ipcMain.handle("api/health", async () => {
    return { status: "ok", version: "1.0.0" };
  });

  ipcMain.handle("api/userProfile", async (_event, email: string) => {
    const token = await tokenManager.getToken();
    if (!token) return null;
    try {
      return await fetchUserProfile(email, token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await tokenManager.clear();
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged"),
        );
        return null;
      }
      throw error;
    }
  });

  ipcMain.handle("api/userMarks", async (_event, email: string) => {
    const token = await tokenManager.getToken();
    if (!token) return [];
    try {
      return await fetchUserMarks(email, token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await tokenManager.clear();
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged"),
        );
        return [];
      }
      throw error;
    }
  });

  ipcMain.handle("api/organizationMarks", async (_event, orgId: string) => {
    const token = await tokenManager.getToken();
    if (!token) return [];
    try {
      return await fetchOrganizationMarks(orgId, token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await tokenManager.clear();
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged"),
        );
        return [];
      }
      throw error;
    }
  });

  ipcMain.handle("db/setCurrentUser", async (_event, email: string | null) => {
    setCurrentUser(email);

    // Start watching folders from database on user login
    if (email) {
      const markFolders = await getAllWatchedFolders();
      const allFolders = Object.values(markFolders).flat();

      if (allFolders.length > 0) {
        const w = getOrCreateWatcher();
        allFolders.forEach((folder) => w.add(folder));
        console.log(`[IPC] Started watching ${allFolders.length} folders for user ${email}`);
      }
    }

    return null;
  });

  ipcMain.handle("db/exec", (_event, sql: string, params?: unknown[]) => {
    dbExec(sql, params);
    return null;
  });

  ipcMain.handle("db/query", (_event, sql: string, params?: unknown[]) => {
    const rows = dbQuery(sql, params);
    return rows;
  });

  ipcMain.handle("app/openExternal", async (_event, target: string) => {
    return await shell.openExternal(
      target.startsWith("http") ? target : `https://${target}`,
    );
  });

  /**
   * Handles first-time login logic
   * - Checks if user has completed first login
   * - Fetches user's marks
   * - Finds "My Artifacts" with visibility "private" (personal mark only)
   * - Automatically attaches the Downloads folder
   * - Marks first login as completed
   */
  ipcMain.handle("auth/handleFirstLogin", async () => {
    console.log("[First Login] Starting first login check...");
    const settings = getSettings();

    // Skip if already completed first login
    if (settings.hasCompletedFirstLogin === true) {
      console.log("[First Login] Skipping - already completed");
      return { skipped: true, reason: "Already completed first login" };
    }

    const token = await tokenManager.getToken();
    if (!token) {
      console.log("[First Login] No token available");
      return { success: false, error: "No token available" };
    }
    console.log("[First Login] Token available: ✓");

    const email = (await getAuthorizedUserFromApi()) as string | null;
    if (!email) {
      console.log("[First Login] No user email available");
      return { success: false, error: "No user email available" };
    }
    console.log("[First Login] User email:", email);

    try {
      // Fetch all user marks
      console.log("[First Login] Fetching user marks...");
      const marks = await fetchUserMarks(email, token);
      console.log("[First Login] Found", marks.length, "marks");

      // Find personal "My Artifacts" with visibility "private"
      const privateMark = marks.find(
        (mark) =>
          mark.name === "My Artifacts" &&
          mark.visibility === "private" &&
          !mark.organization, // Ensure it's a personal mark
      );

      if (!privateMark) {
        console.log('[First Login] No private "My Artifacts" found');
        sendNotification(
          "info",
          "No private workspace found. Downloads folder will not be auto-tracked.",
        );
        // Mark as completed even if no private mark found
        updateSettings({ hasCompletedFirstLogin: true });
        return {
          success: true,
          attached: false,
          reason: "No matching My Artifacts found",
        };
      }

      console.log(
        "[First Login] Found My Artifacts:",
        privateMark.id,
        privateMark.name,
      );

      // Get Downloads folder path
      const downloadsPath = app.getPath("downloads");
      console.log("[First Login] Downloads path:", downloadsPath);

      // Check if Downloads folder is already attached
      const currentList = await getWatchedFoldersForMark(privateMark.id);

      if (!currentList.includes(downloadsPath)) {
        console.log("[First Login] Attaching downloads folder to watcher...");
        // Attach Downloads folder to the mark
        await addWatchedFolder(privateMark.id, downloadsPath);
        updateSettings({ hasCompletedFirstLogin: true });

        // Add to watcher
        const w = getOrCreateWatcher();
        w.add(downloadsPath);
        console.log("[First Login] Watcher updated successfully ✓");

        sendNotification(
          "success",
          `Downloads folder connected to "${privateMark.name}"`,
        );

        return {
          success: true,
          attached: true,
          markId: privateMark.id,
          markName: privateMark.name,
          folderPath: downloadsPath,
        };
      } else {
        console.log("[First Login] Downloads folder already attached");
        // Already attached, just mark as completed
        updateSettings({ hasCompletedFirstLogin: true });
        return {
          success: true,
          attached: false,
          reason: "Downloads folder already attached",
        };
      }
    } catch (error) {
      console.error("[First Login] Error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      sendNotification(
        "error",
        "Failed to attach downloads folder: " + errorMsg,
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  });

  ipcMain.handle("auth/attachDownloadsFolder", async () => {
    const token = await tokenManager.getToken();
    if (!token) {
      return { success: false, error: "No token available" };
    }

    const email = (await getAuthorizedUserFromApi()) as string | null;
    if (!email) {
      return { success: false, error: "No user email available" };
    }

    try {
      const marks = await fetchUserMarks(email, token);
      const privateMark = marks.find(
        (mark) =>
          mark.name === "My Artifacts" &&
          mark.visibility === "private" &&
          !mark.organization,
      );

      if (!privateMark) {
        sendNotification(
          "error",
          'No private "My Artifacts" found. Create one first.',
        );
        return {
          success: false,
          error: "No matching My Artifacts found",
        };
      }

      const downloadsPath = app.getPath("downloads");
      const currentList = await getWatchedFoldersForMark(privateMark.id);

      if (currentList.includes(downloadsPath)) {
        sendNotification(
          "info",
          "Downloads folder is already connected to My Artifacts",
        );
        return {
          success: true,
          attached: false,
          reason: "Downloads folder already attached",
        };
      }

      await addWatchedFolder(privateMark.id, downloadsPath);

      const w = getOrCreateWatcher();
      w.add(downloadsPath);

      sendNotification(
        "success",
        "Downloads folder successfully connected to My Artifacts",
      );
      return {
        success: true,
        attached: true,
        markId: privateMark.id,
        markName: privateMark.name,
        folderPath: downloadsPath,
      };
    } catch (error) {
      console.error("Error attaching downloads folder:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      sendNotification(
        "error",
        "Failed to attach downloads folder: " + errorMsg,
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  });

  ipcMain.handle("app/getPath", async (_event, name: string) => {
    return app.getPath(name as any);
  });
}

export function stopWatcher() {
  watcher?.stop();
}
