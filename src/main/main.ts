import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { registerIpcHandlers, stopWatcher } from './ipc';
import { getSettings } from './settings';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.ts'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open App', click: () => mainWindow?.show() },
    { label: 'Re-authenticate', click: () => mainWindow?.webContents.send('tokenChanged') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('UCFR Desktop');
  tray.setContextMenu(menu);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopWatcher();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopWatcher();
});

export {}; // keep TypeScript happy when module is unused
