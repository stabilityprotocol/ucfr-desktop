import { contextBridge, ipcRenderer } from "electron";

type RendererAPI = {
  auth: {
    getToken: () => Promise<string | null>;
    clearToken: () => Promise<null>;
    startLoginFlow: () => Promise<unknown>;
    getUser: () => Promise<unknown>;
    handleFirstLogin: () => Promise<unknown>;
    validateToken: () => Promise<{ valid: boolean }>;
  };
  settings: {
    get: () => Promise<unknown>;
    set: (update: Record<string, unknown>) => Promise<unknown>;
    selectFolder: () => Promise<string | null>;
  };
  project: {
    addFolder: (projectId: string) => Promise<string[] | null>;
    removeFolder: (projectId: string, folderPath: string) => Promise<string[]>;
    getFolders: (projectId: string) => Promise<string[]>;
    getHistory: (projectId: string) => Promise<any[]>;
  };
  app: {
    toggleAutoStart: (enable: boolean) => Promise<boolean>;
    openExternal: (target: string) => Promise<void>;
  };
  sync: {
    startWatcher: (folderPath: string) => Promise<boolean>;
    onWatcherEvent: (callback: (payload: any) => void) => () => void;
  };
  api: {
    me: () => Promise<unknown>;
    projects: () => Promise<unknown>;
    health: () => Promise<unknown>;
    userProfile: (email: string) => Promise<unknown>;
    userProjects: (email: string) => Promise<unknown>;
    organizationProjects: (orgId: string) => Promise<unknown>;
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
  },
  settings: {
    get: () => ipcRenderer.invoke("settings/get"),
    set: (update) => ipcRenderer.invoke("settings/set", update),
    selectFolder: () => ipcRenderer.invoke("folder/select"),
  },
  project: {
    addFolder: (projectId) =>
      ipcRenderer.invoke("project/addFolder", projectId),
    removeFolder: (projectId, folderPath) =>
      ipcRenderer.invoke("project/removeFolder", projectId, folderPath),
    getFolders: (projectId) =>
      ipcRenderer.invoke("project/getFolders", projectId),
    getHistory: (projectId) =>
      ipcRenderer.invoke("project/getHistory", projectId),
  },
  app: {
    toggleAutoStart: (enable) =>
      ipcRenderer.invoke("app/toggleAutoStart", enable),
    openExternal: (target) => ipcRenderer.invoke("app/openExternal", target),
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
    projects: () => ipcRenderer.invoke("api/projects"),
    health: () => ipcRenderer.invoke("api/health"),
    userProfile: (email) => ipcRenderer.invoke("api/userProfile", email),
    userProjects: (email) => ipcRenderer.invoke("api/userProjects", email),
    organizationProjects: (orgId) =>
      ipcRenderer.invoke("api/organizationProjects", orgId),
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

export type { RendererAPI };
