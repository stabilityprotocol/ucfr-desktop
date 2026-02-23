import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import path from "path";
import { registerIpcHandlers, stopWatcher } from "./ipc";
import { getSettings } from "./settings";

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  let preloadPath: string;
  if (isDev) {
    // In dev mode, preload is compiled to app/preload/index.js
    preloadPath = path.resolve(process.cwd(), "app/preload/index.js");
  } else {
    // In production, preload is in the same app structure
    preloadPath = path.join(__dirname, "../preload/index.js");
  }

  // Determine icon path
  const iconPath = isDev
    ? path.join(process.cwd(), 'src/assets/icons/icon.png')
    : path.join(__dirname, '../assets/icons/icon.png');
  
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    title: "Monolith",
    resizable: false,
    icon: icon,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function createTray() {
  // Use template icon on macOS for proper light/dark mode support
  const isMac = process.platform === 'darwin';
  let iconPath: string;
  
  if (isMac) {
    // macOS uses template images that are automatically tinted
    iconPath = isDev 
      ? path.join(process.cwd(), 'src/assets/icons/trayTemplate.png')
      : path.join(__dirname, '../assets/icons/trayTemplate.png');
  } else {
    // Windows/Linux use regular colored icon
    iconPath = isDev 
      ? path.join(process.cwd(), 'src/assets/icons/icon.png')
      : path.join(__dirname, '../assets/icons/icon.png');
  }
  
  const icon = nativeImage.createFromPath(iconPath);
  
  // On macOS, mark as template image so it adapts to light/dark mode
  if (isMac) {
    icon.setTemplateImage(true);
  }
  
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: "Open App", click: () => mainWindow?.show() },
    {
      label: "Re-authenticate",
      click: () => mainWindow?.webContents.send("tokenChanged"),
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setToolTip("Monolith");
  tray.setContextMenu(menu);
}

app.whenReady().then(async () => {
  try {
    await registerIpcHandlers();
  } catch (err) {
    console.error("[main] Failed to initialize IPC handlers / database:", err);
    // Continue launching the window so the user at least sees the app
  }

  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopWatcher();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopWatcher();
});

export {}; // keep TypeScript happy when module is unused
