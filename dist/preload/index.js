"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    auth: {
        getToken: () => electron_1.ipcRenderer.invoke("auth/getToken"),
        clearToken: () => electron_1.ipcRenderer.invoke("auth/clearToken"),
        startLoginFlow: () => electron_1.ipcRenderer.invoke("auth/startLoginFlow"),
        getUser: () => electron_1.ipcRenderer.invoke("auth/getUser"),
    },
    settings: {
        get: () => electron_1.ipcRenderer.invoke("settings/get"),
        set: (update) => electron_1.ipcRenderer.invoke("settings/set", update),
        selectFolder: () => electron_1.ipcRenderer.invoke("folder/select"),
    },
    app: {
        toggleAutoStart: (enable) => electron_1.ipcRenderer.invoke("app/toggleAutoStart", enable),
        openExternal: (target) => electron_1.ipcRenderer.invoke("app/openExternal", target),
    },
    sync: {
        startWatcher: (folderPath) => electron_1.ipcRenderer.invoke("sync/startWatcher", folderPath),
    },
    api: {
        me: () => electron_1.ipcRenderer.invoke("api/me"),
        projects: () => electron_1.ipcRenderer.invoke("api/projects"),
        health: () => electron_1.ipcRenderer.invoke("api/health"),
        userProfile: (email) => electron_1.ipcRenderer.invoke("api/userProfile", email),
        userProjects: (email) => electron_1.ipcRenderer.invoke("api/userProjects", email),
        organizationProjects: (orgId) => electron_1.ipcRenderer.invoke("api/organizationProjects", orgId),
    },
};
electron_1.contextBridge.exposeInMainWorld("ucfr", api);
electron_1.ipcRenderer.on("tokenChanged", () => {
    window.dispatchEvent(new Event("tokenChanged"));
});
