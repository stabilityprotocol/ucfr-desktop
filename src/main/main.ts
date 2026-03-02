import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import path from "path";
import { applyAuthToken, registerIpcHandlers, stopWatcher } from "./ipc";

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let pendingDeepLink: string | null = null;

const isDev = !app.isPackaged;
const appProtocol = "monolithbystability";

function extractDeepLink(argv: string[]) {
  return argv.find((arg) => arg.startsWith(`${appProtocol}://`)) ?? null;
}

function focusMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function flushPendingDeepLink() {
  if (!mainWindow || !pendingDeepLink) {
    return;
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    return;
  }

  mainWindow.webContents.send("app/open-url", pendingDeepLink);
  pendingDeepLink = null;
}

function getTokenFromDeepLink(target: string): string | null {
  try {
    const url = new URL(target);
    if (url.protocol !== `${appProtocol}:` || url.host !== "token") {
      return null;
    }

    const token = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    return token || null;
  } catch {
    return null;
  }
}

async function handleDeepLink(url: string) {
  const token = getTokenFromDeepLink(url);
  if (token) {
    const result = await applyAuthToken(token, "deeplink");
    if (!result.ok) {
      console.error("[main] Failed to apply token from deep link:", result.reason);
    }

    pendingDeepLink = "/";
  } else {
    pendingDeepLink = url;
  }

  if (!app.isReady()) {
    return;
  }

  if (!mainWindow) {
    createWindow();
  }

  focusMainWindow();
  flushPendingDeepLink();
}

function registerAppProtocol() {
  if (isDev) {
    const entryPoint = process.argv[1];
    if (entryPoint) {
      app.setAsDefaultProtocolClient(
        appProtocol,
        process.execPath,
        [path.resolve(entryPoint)],
      );
      return;
    }
  }

  app.setAsDefaultProtocolClient(appProtocol);
}

function resolveAssetPath(...segments: string[]) {
  return isDev
    ? path.join(process.cwd(), "src", "assets", ...segments)
    : path.join(process.resourcesPath, "assets", ...segments);
}

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
  const iconPath = resolveAssetPath("icons", "icon.png");
  
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

  mainWindow.webContents.once("did-finish-load", () => {
    flushPendingDeepLink();
  });
}

function createTray() {
  // Use template icon on macOS for proper light/dark mode support
  const isMac = process.platform === 'darwin';
  const iconPath = isMac
    ? resolveAssetPath("icons", "trayTemplate.png")
    : resolveAssetPath("icons", "icon.png");
  
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.error(`[main] Failed to load tray icon from ${iconPath}`);
    return;
  }
  
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

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const deepLink = extractDeepLink(argv);
    if (deepLink) {
      void handleDeepLink(deepLink);
      return;
    }

    focusMainWindow();
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    void handleDeepLink(url);
  });

  app.whenReady().then(async () => {
    registerAppProtocol();

    try {
      await registerIpcHandlers();
    } catch (err) {
      console.error("[main] Failed to initialize IPC handlers / database:", err);
      // Continue launching the window so the user at least sees the app
    }

    createWindow();
    createTray();

    if (pendingDeepLink) {
      void handleDeepLink(pendingDeepLink);
    }

    const initialDeepLink = extractDeepLink(process.argv);
    if (initialDeepLink) {
      void handleDeepLink(initialDeepLink);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        return;
      }

      focusMainWindow();
    });
  });
}

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
