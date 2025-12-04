import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import path from "path";
import { registerIpcHandlers, stopWatcher } from "./ipc";
import { getSettings } from "./settings";
import { startDbServer } from "../server/dbServer";

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

  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    title: "Monolith",
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
  const icon = nativeImage.createEmpty();
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
  // Start embedded DB server (Express + PGlite) inside this process
  await startDbServer();
  await registerIpcHandlers();
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
