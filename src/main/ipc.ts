import { app, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import { randomUUID } from 'crypto';
import { tokenManager } from './tokenStore';
import { getSettings, updateSettings } from './settings';
import { FolderWatcher } from './watcher';
import { fetchProjects, fetchCurrentUser, fetchHealth } from '../shared/api/mockApi';

let watcher: FolderWatcher | null = null;

async function pollForToken(requestId: string): Promise<string | null> {
  const pollUrl = `https://auth.ucfr.io/v1/auth/poll/${requestId}`;
  // Poll for up to 5 minutes
  const maxAttempts = 150; 
  const intervalMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(pollUrl);
      if (response.ok) {
        const data = await response.json() as { token: string };
        return data.token;
      } else if (response.status === 404) {
        // Token not ready, wait and retry
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } else {
        console.error('Auth polling failed:', response.statusText);
        return null;
      }
    } catch (err) {
      console.error('Auth polling error:', err);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  return null;
}

export function registerIpcHandlers() {
  ipcMain.handle('auth/getToken', async () => tokenManager.getToken());

  ipcMain.handle('auth/clearToken', async () => {
    await tokenManager.clear();
    return null;
  });

  ipcMain.handle('auth/startLoginFlow', async () => {
    const requestId = randomUUID();
    const authUrl = `https://auth.ucfr.io/?request_id=${requestId}`;
    
    await shell.openExternal(authUrl);
    
    const token = await pollForToken(requestId);
    
    if (token) {
      await tokenManager.setToken(token);
      return { token };
    } else {
      throw new Error('Authentication timed out or failed.');
    }
  });

  ipcMain.handle('settings/get', async () => getSettings());

  ipcMain.handle('settings/set', async (_event, update: Partial<ReturnType<typeof getSettings>>) => {
    const next = updateSettings(update);
    return next;
  });

  ipcMain.handle('folder/select', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length) {
      const folderPath = result.filePaths[0];
      updateSettings({ folderPath });
      return folderPath;
    }
    return null;
  });

  ipcMain.handle('app/toggleAutoStart', async (_event, enable: boolean) => {
    updateSettings({ autoStart: enable });
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath,
      args: enable ? ['--hidden'] : []
    });
    return enable;
  });

  ipcMain.handle('sync/startWatcher', async (_event, folderPath: string) => {
    if (!watcher) {
      watcher = new FolderWatcher((payload) => {
        console.log('Sync event', payload);
      });
    }
    watcher.start(folderPath);
    return true;
  });

  ipcMain.handle('api/projects', async () => fetchProjects());
  ipcMain.handle('api/me', async () => fetchCurrentUser());
  ipcMain.handle('api/health', async () => fetchHealth());

  ipcMain.handle('app/openExternal', async (_event, target: string) => {
    await shell.openExternal(target.startsWith('http') ? target : `https://${target}`);
  });
}

export function stopWatcher() {
  watcher?.stop();
}
