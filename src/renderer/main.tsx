import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import type { RendererAPI } from "../preload";
import {
  fetchMe,
  fetchMyMarks,
  fetchOrganizationMarks,
} from "../shared/api/client";

const CONFIG_TOKEN_KEY = "auth.token";
const SETTINGS_KEY = "ucfr.settings";

function getStoredSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getDbToken(): string | null {
  try {
    return localStorage.getItem(CONFIG_TOKEN_KEY);
  } catch (err) {
    console.error("getDbToken failed:", err);
    return null;
  }
}

function setDbToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(CONFIG_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(CONFIG_TOKEN_KEY);
    }
  } catch (err) {
    console.error("setDbToken failed:", err);
  }
}

function setStoredSettings(
  update: Record<string, unknown>
): Record<string, unknown> {
  const current = getStoredSettings();
  const next = { ...current, ...update };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

async function webPollForToken(requestId: string): Promise<string | null> {
  const pollUrl = `https://auth.stabilityprotocol.com/v1/auth/poll/${requestId}`;
  const maxAttempts = 150;
  const intervalMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(pollUrl);
      if (response.ok) {
        const data = (await response.json()) as { token: string };
        return data.token;
      } else if (response.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } else {
        console.error("Auth polling failed (web):", response.statusText);
        return null;
      }
    } catch (err) {
      console.error("Auth polling error (web):", err);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return null;
}

/**
 * Resolves the authenticated user's email by calling GET /api/users/me.
 * Returns the email string (used as local session key) or null on failure.
 */
async function webGetAuthorizedUser(token: string): Promise<string | null> {
  try {
    const profile = await fetchMe(token);
    if (!profile) {
      setDbToken(null);
      return null;
    }
    return profile.email ?? null;
  } catch (err) {
    console.error("webGetAuthorizedUser error:", err);
    return null;
  }
}

function createWebApi(): RendererAPI {
  return {
    auth: {
      getToken: () => Promise.resolve(getDbToken()),
      clearToken: () => {
        setDbToken(null);
        window.dispatchEvent(new Event("tokenChanged"));
        return Promise.resolve(null);
      },
      logout: () => {
        setDbToken(null);
        // Clear settings from localStorage
        try {
          localStorage.removeItem(SETTINGS_KEY);
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event("tokenChanged"));
        return Promise.resolve(null);
      },
      startLoginFlow: () => {
        const requestId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        void (async () => {
          const token = await webPollForToken(requestId);
          if (token) {
            setDbToken(token);
            window.dispatchEvent(new Event("tokenChanged"));
          } else {
            console.error("Web authentication timed out or failed.");
          }
        })();

        return Promise.resolve({ requestId });
      },
      // Returns the full UserProfile (or null) — matches updated Electron IPC handler
      getUser: async () => {
        const token = getDbToken();
        if (!token) return null;
        return fetchMe(token);
      },
      // Validates the token by calling GET /api/users/me.
      // If the endpoint returns a profile, the token is valid.
      validateToken: async () => {
        const token = getDbToken();
        if (!token) return { valid: false };
        try {
          const profile = await fetchMe(token);
          return { valid: profile !== null };
        } catch {
          // Network errors are treated as "unknown" — assume valid to avoid
          // logging out users when offline.
          return { valid: true };
        }
      },
    },
    settings: {
      get: async () => getStoredSettings(),
      set: async (update: Record<string, unknown>) => setStoredSettings(update),
      selectFolder: async () => {
        console.warn("selectFolder is not supported in web environment.");
        return null;
      },
    },
    mark: {
      addFolder: async () => {
        console.warn("addFolder is not supported in web environment.");
        return null;
      },
      removeFolder: async (_markId: string, _folderPath: string) => {
        console.warn("removeFolder is not supported in web environment.");
        return [];
      },
      getFolders: async () => {
        console.warn("getFolders is not supported in web environment.");
        return [];
      },
      getAllWatchedFolders: async () => {
        console.warn("getAllWatchedFolders is not supported in web environment.");
        return {};
      },
      getHistory: async (_markId: string, _page: number = 1, _pageSize: number = 20) => {
        // Web environment: file history is not supported
        console.warn("getHistory is not supported in web environment.");
        return { items: [], total: 0 };
      },
      getRecentActivity: async (_page: number = 1, _pageSize: number = 20) => {
        console.warn("getRecentActivity is not supported in web environment.");
        return { items: [], total: 0 };
      },
    },
    app: {
      toggleAutoStart: async (_enable: boolean) => {
        console.warn("toggleAutoStart is not supported in web environment.");
        return false;
      },
      openExternal: async (target: string) => {
        const url = target.startsWith("http") ? target : `https://${target}`;
        window.open(url, "_blank", "noopener,noreferrer");
      },
      getPath: async (_name: string) => {
        console.warn("getPath is not supported in web environment.");
        return "";
      },
      onOpenUrl: () => () => undefined,
    },
    sync: {
      startWatcher: async () => {
        console.warn("startWatcher is not supported in web environment.");
        return false;
      },
      onWatcherEvent: (_callback: (payload: any) => void) => {
        console.warn("onWatcherEvent is not supported in web environment.");
        return () => {};
      },
    },
    api: {
      // Fetches the authenticated user's profile via GET /api/users/me
      me: async () => {
        const token = getDbToken();
        if (!token) return null;
        return fetchMe(token);
      },
      // Fetches all marks for the authenticated user via GET /api/projects
      marks: async () => {
        const token = getDbToken();
        if (!token) return [];
        return fetchMyMarks(token);
      },
      health: async () => {
        return { status: "ok", version: "1.0.0" };
      },
      // Kept for backward compat; email param is unused — delegates to fetchMe
      userProfile: async (_email: string) => {
        const token = getDbToken();
        if (!token) return null;
        return fetchMe(token);
      },
      // Kept for backward compat; email param is unused — delegates to fetchMyMarks
      userMarks: async (_email: string) => {
        const token = getDbToken();
        if (!token) return [];
        return fetchMyMarks(token);
      },
      organizationMarks: async (orgId: string) => {
        const token = getDbToken();
        if (!token) return [];
        return fetchOrganizationMarks(orgId, token);
      },
    },
    db: {
      exec: async (_sql: string) => {
        console.warn("db.exec is not supported in pure web environment.");
        return null;
      },
      query: async <T = any,>(_sql: string, _params?: unknown[]) => {
        console.warn("db.query is not supported in pure web environment.");
        return [] as T[];
      },
      setCurrentUser: async (_email: string | null) => {
        // No-op in web environment - database is main-process only
        return null;
      },
    },
    update: {
      check: async () => ({ success: false, error: "Not supported in web environment" }),
      install: async () => {
        console.warn("update.install is not supported in web environment.");
      },
      onStatus: () => () => {},
    },
  };
}

if (typeof window !== "undefined" && !window.ucfr) {
  window.ucfr = createWebApi();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
