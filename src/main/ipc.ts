import { app, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import { tokenManager } from './tokenStore';
import { getSettings, updateSettings } from './settings';
import { FolderWatcher } from './watcher';
import { fetchProjects, fetchCurrentUser, fetchHealth, loginWithToken } from '../shared/api/mockApi';

let watcher: FolderWatcher | null = null;

export function registerIpcHandlers() {
  ipcMain.handle('auth/getToken', async () => tokenManager.getToken());

  ipcMain.handle('auth/clearToken', async () => {
    await tokenManager.clear();
    return null;
  });

  ipcMain.handle('auth/startLoginFlow', async () => {
    const token = `mock-token-${Date.now()}`;
    await tokenManager.setToken(token);
    return loginWithToken(token);
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
