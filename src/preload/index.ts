import { contextBridge, ipcRenderer } from "electron";

type RendererAPI = {
  auth: {
    getToken: () => Promise<string | null>;
    clearToken: () => Promise<null>;
    startLoginFlow: () => Promise<unknown>;
    getUser: () => Promise<unknown>;
  };
  settings: {
    get: () => Promise<unknown>;
    set: (update: Record<string, unknown>) => Promise<unknown>;
    selectFolder: () => Promise<string | null>;
  };
  app: {
    toggleAutoStart: (enable: boolean) => Promise<boolean>;
    openExternal: (target: string) => Promise<void>;
  };
  sync: {
    startWatcher: (folderPath: string) => Promise<boolean>;
  };
  api: {
    me: () => Promise<unknown>;
    projects: () => Promise<unknown>;
    health: () => Promise<unknown>;
    userProfile: (email: string) => Promise<unknown>;
    userProjects: (email: string) => Promise<unknown>;
    organizationProjects: (orgId: string) => Promise<unknown>;
  };
};

const api: RendererAPI = {
  auth: {
    getToken: () => ipcRenderer.invoke("auth/getToken"),
    clearToken: () => ipcRenderer.invoke("auth/clearToken"),
    startLoginFlow: () => ipcRenderer.invoke("auth/startLoginFlow"),
    getUser: () => ipcRenderer.invoke("auth/getUser"),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings/get"),
    set: (update) => ipcRenderer.invoke("settings/set", update),
    selectFolder: () => ipcRenderer.invoke("folder/select"),
  },
  app: {
    toggleAutoStart: (enable) =>
      ipcRenderer.invoke("app/toggleAutoStart", enable),
    openExternal: (target) => ipcRenderer.invoke("app/openExternal", target),
  },
  sync: {
    startWatcher: (folderPath) =>
      ipcRenderer.invoke("sync/startWatcher", folderPath),
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
};

contextBridge.exposeInMainWorld("ucfr", api);

ipcRenderer.on("tokenChanged", () => {
  window.dispatchEvent(new Event("tokenChanged"));
});

export type { RendererAPI };
