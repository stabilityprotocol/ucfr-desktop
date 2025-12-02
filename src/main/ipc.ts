import { app, dialog, ipcMain, shell } from "electron";
import { randomUUID } from "crypto";
import { tokenManager } from "./tokenStore";
import { getSettings, updateSettings } from "./settings";
import { FolderWatcher } from "./watcher";
import {
  fetchProjects,
  fetchCurrentUser,
  fetchHealth,
} from "../shared/api/mockApi";

let watcher: FolderWatcher | null = null;

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
      }
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

export function registerIpcHandlers() {
  ipcMain.handle("auth/getToken", async () => tokenManager.getToken());

  ipcMain.handle("auth/getUser", async () => {
    return getAuthorizedUserFromApi();
  });

  ipcMain.handle("auth/clearToken", async () => {
    await tokenManager.clear();
    return null;
  });

  ipcMain.handle("auth/startLoginFlow", async () => {
    const requestId = randomUUID();

    // Start polling in the background; when the token is ready, store it.
    void (async () => {
      const token = await pollForToken(requestId);
      if (token) {
        await tokenManager.setToken(token);
      } else {
        console.error("Authentication timed out or failed.");
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
    }
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
    if (!watcher) {
      watcher = new FolderWatcher((payload) => {
        console.log("Sync event", payload);
      });
    }
    watcher.start(folderPath);
    return true;
  });

  ipcMain.handle("api/projects", async () => fetchProjects());
  ipcMain.handle("api/me", async () => fetchCurrentUser());
  ipcMain.handle("api/health", async () => fetchHealth());

  ipcMain.handle("app/openExternal", async (_event, target: string) => {
    return await shell.openExternal(
      target.startsWith("http") ? target : `https://${target}`
    );
  });
}

export function stopWatcher() {
  watcher?.stop();
}
