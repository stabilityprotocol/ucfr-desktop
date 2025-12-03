import { app, dialog, ipcMain, shell, BrowserWindow } from "electron";
import { randomUUID } from "crypto";
import { tokenManager } from "./tokenStore";
import { getSettings, updateSettings } from "./settings";
import { FolderWatcher } from "./watcher";
import { handleFileChange } from "./claimService";
import {
  fetchProjects,
  fetchCurrentUser,
  fetchHealth,
} from "../shared/api/mockApi";
import {
  fetchUserProfile,
  fetchUserProjects,
  fetchOrganizationProjects,
} from "../shared/api/client";
import { initDb } from "./db";
import { fileHistoryService } from "./fileHistory";

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

function getOrCreateWatcher(): FolderWatcher {
  if (!watcher) {
    watcher = new FolderWatcher((payload) => {
      console.log("Sync event", payload);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("watcher-event", payload)
      );

      // Trigger claim creation logic
      handleFileChange(payload.file, payload.event);

      // Track history
      fileHistoryService.handleEvent(payload.event, payload.file);
    });
  }
  return watcher;
}

export async function registerIpcHandlers() {
  await initDb();

  // Initialize watcher with existing folders
  const settings = getSettings();
  const projectFolders = settings.projectFolders || {};
  const allFolders = Object.values(projectFolders).flat();

  if (allFolders.length > 0) {
    const w = getOrCreateWatcher();
    allFolders.forEach((folder) => w.add(folder));
  }

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
        // Notify all renderer windows that the token has changed
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged")
        );
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

  ipcMain.handle("project/addFolder", async (_event, projectId: string) => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (!result.canceled && result.filePaths.length) {
      const folderPath = result.filePaths[0];
      const currentSettings = getSettings();
      const projectFolders = currentSettings.projectFolders || {};
      const currentList = projectFolders[projectId] || [];

      if (!currentList.includes(folderPath)) {
        const newList = [...currentList, folderPath];
        updateSettings({
          projectFolders: {
            ...projectFolders,
            [projectId]: newList,
          },
        });

        const w = getOrCreateWatcher();
        w.add(folderPath);

        return newList;
      }
      return currentList;
    }
    return null;
  });

  ipcMain.handle(
    "project/removeFolder",
    async (_event, projectId: string, folderPath: string) => {
      const currentSettings = getSettings();
      const projectFolders = currentSettings.projectFolders || {};
      const currentList = projectFolders[projectId] || [];

      const newList = currentList.filter((p) => p !== folderPath);
      updateSettings({
        projectFolders: {
          ...projectFolders,
          [projectId]: newList,
        },
      });
      if (watcher) {
        watcher.unwatch(folderPath);
      }
      return newList;
    }
  );

  ipcMain.handle("project/getFolders", async (_event, projectId: string) => {
    const currentSettings = getSettings();
    const projectFolders = currentSettings.projectFolders || {};
    return projectFolders[projectId] || [];
  });

  ipcMain.handle("project/getHistory", async (_event, projectId: string) => {
    const currentSettings = getSettings();
    const projectFolders = currentSettings.projectFolders || {};
    const folders = projectFolders[projectId] || [];
    return await fileHistoryService.getHistoryForFolders(folders);
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

  ipcMain.handle("api/projects", async () => fetchProjects());
  ipcMain.handle("api/me", async () => fetchCurrentUser());
  ipcMain.handle("api/health", async () => fetchHealth());
  ipcMain.handle("api/userProfile", async (_event, email: string) => {
    const token = await tokenManager.getToken();
    if (!token) return null;
    return fetchUserProfile(email, token);
  });

  ipcMain.handle("api/userProjects", async (_event, email: string) => {
    const token = await tokenManager.getToken();
    if (!token) return [];
    return fetchUserProjects(email, token);
  });

  ipcMain.handle("api/organizationProjects", async (_event, orgId: string) => {
    const token = await tokenManager.getToken();
    if (!token) return [];
    return fetchOrganizationProjects(orgId, token);
  });

  ipcMain.handle("app/openExternal", async (_event, target: string) => {
    return await shell.openExternal(
      target.startsWith("http") ? target : `https://${target}`
    );
  });
}

export function stopWatcher() {
  watcher?.stop();
}
