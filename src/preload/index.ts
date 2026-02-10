import { contextBridge, ipcRenderer } from "electron";

type RendererAPI = {
  auth: {
    getToken: () => Promise<string | null>;
    clearToken: () => Promise<null>;
    startLoginFlow: () => Promise<unknown>;
    getUser: () => Promise<unknown>;
    handleFirstLogin: () => Promise<unknown>;
    validateToken: () => Promise<{ valid: boolean }>;
    attachDownloadsFolder: () => Promise<unknown>;
  };
  settings: {
    get: () => Promise<unknown>;
    set: (update: Record<string, unknown>) => Promise<unknown>;
    selectFolder: () => Promise<string | null>;
  };
  mark: {
    addFolder: (markId: string) => Promise<string[] | null>;
    removeFolder: (markId: string, folderPath: string) => Promise<string[]>;
    getFolders: (markId: string) => Promise<string[]>;
    getHistory: (markId: string) => Promise<any[]>;
  };
  app: {
    toggleAutoStart: (enable: boolean) => Promise<boolean>;
    openExternal: (target: string) => Promise<void>;
    getPath: (name: string) => Promise<string>;
  };
  sync: {
    startWatcher: (folderPath: string) => Promise<boolean>;
    onWatcherEvent: (callback: (payload: any) => void) => () => void;
  };
  api: {
    me: () => Promise<unknown>;
    marks: () => Promise<unknown>;
    health: () => Promise<unknown>;
    userProfile: (email: string) => Promise<unknown>;
    userMarks: (email: string) => Promise<unknown>;
    organizationMarks: (orgId: string) => Promise<unknown>;
  };
  db: {
    exec: (sql: string) => Promise<null>;
    query: <T = any>(sql: string, params?: unknown[]) => Promise<T[]>;
  };
};

const api: RendererAPI = {
  auth: {
    getToken: () => ipcRenderer.invoke("auth/getToken"),
    clearToken: () => ipcRenderer.invoke("auth/clearToken"),
    startLoginFlow: () => ipcRenderer.invoke("auth/startLoginFlow"),
    getUser: () => ipcRenderer.invoke("auth/getUser"),
    handleFirstLogin: () => ipcRenderer.invoke("auth/handleFirstLogin"),
    validateToken: () => ipcRenderer.invoke("auth/validateToken"),
    attachDownloadsFolder: () => ipcRenderer.invoke("auth/attachDownloadsFolder"),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings/get"),
    set: (update) => ipcRenderer.invoke("settings/set", update),
    selectFolder: () => ipcRenderer.invoke("folder/select"),
  },
  mark: {
    addFolder: (markId) =>
      ipcRenderer.invoke("mark/addFolder", markId),
    removeFolder: (markId, folderPath) =>
      ipcRenderer.invoke("mark/removeFolder", markId, folderPath),
    getFolders: (markId) =>
      ipcRenderer.invoke("mark/getFolders", markId),
    getHistory: (markId) =>
      ipcRenderer.invoke("mark/getHistory", markId),
  },
  app: {
    toggleAutoStart: (enable) =>
      ipcRenderer.invoke("app/toggleAutoStart", enable),
    openExternal: (target) => ipcRenderer.invoke("app/openExternal", target),
    getPath: (name) => ipcRenderer.invoke("app/getPath", name),
  },
  sync: {
    startWatcher: (folderPath) =>
      ipcRenderer.invoke("sync/startWatcher", folderPath),
    onWatcherEvent: (callback) => {
      const subscription = (_event: any, payload: any) => {
        console.log("Preload: watcher-event received", payload);
        callback(payload);
      };
      ipcRenderer.on("watcher-event", subscription);
      return () => ipcRenderer.removeListener("watcher-event", subscription);
    },
  },
  api: {
    me: () => ipcRenderer.invoke("api/me"),
    marks: () => ipcRenderer.invoke("api/marks"),
    health: () => ipcRenderer.invoke("api/health"),
    userProfile: (email) => ipcRenderer.invoke("api/userProfile", email),
    userMarks: (email) => ipcRenderer.invoke("api/userMarks", email),
    organizationMarks: (orgId) =>
      ipcRenderer.invoke("api/organizationMarks", orgId),
  },
  db: {
    exec: (sql) => ipcRenderer.invoke("db/exec", sql),
    query: (sql, params) => ipcRenderer.invoke("db/query", sql, params),
  },
};

contextBridge.exposeInMainWorld("ucfr", api);

ipcRenderer.on("tokenChanged", () => {
  window.dispatchEvent(new Event("tokenChanged"));
});

ipcRenderer.on("notification", (_event, payload) => {
  window.dispatchEvent(new CustomEvent("notification", { detail: payload }));
});

export type { RendererAPI };
