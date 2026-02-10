import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import type { RendererAPI } from "../preload";
import {
  fetchOrganizationMarks,
  fetchUserProfile,
  fetchUserMarks,
} from "../shared/api/client";
import { dbExec, dbQuery } from "../shared/dbClient";

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

async function getDbToken(): Promise<string | null> {
  try {
    const rows = await dbQuery<{ value: string }>(
      "SELECT value FROM config WHERE key = $1",
      [CONFIG_TOKEN_KEY]
    );
    return rows[0]?.value ?? null;
  } catch (err) {
    console.error("getDbToken failed:", err);
    return null;
  }
}

async function setDbToken(token: string | null): Promise<void> {
  try {
    if (token) {
      const now = Date.now();
      await dbExec(
        `
        INSERT INTO config (key, value, created_at, updated_at)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
      `,
        [CONFIG_TOKEN_KEY, token, now]
      );
    } else {
      await dbExec("DELETE FROM config WHERE key = $1", [CONFIG_TOKEN_KEY]);
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

async function webGetAuthorizedUser(token: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://auth.stabilityprotocol.com/v1/auth/is-authorized",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      await setDbToken(null);
      return null;
    }

    if (!response.ok) {
      console.error("is-authorized (web) failed:", response.statusText);
      return null;
    }

    const data = (await response.json()) as {
      ok: boolean;
      value?: { email: string };
    };

    if (!data.ok) return null;
    return data.value?.email ?? null;
  } catch (err) {
    console.error("is-authorized (web) error:", err);
    return null;
  }
}

function createWebApi(): RendererAPI {
  return {
    auth: {
      getToken: async () => getDbToken(),
      clearToken: async () => {
        await setDbToken(null);
        window.dispatchEvent(new Event("tokenChanged"));
        return null;
      },
      startLoginFlow: async () => {
        const requestId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        void (async () => {
          const token = await webPollForToken(requestId);
          if (token) {
            await setDbToken(token);
            window.dispatchEvent(new Event("tokenChanged"));
          } else {
            console.error("Web authentication timed out or failed.");
          }
        })();

        return { requestId };
      },
      getUser: async () => {
        const token = await getDbToken();
        if (!token) return null;
        return webGetAuthorizedUser(token);
      },
      handleFirstLogin: async () => {
        console.warn("handleFirstLogin is not supported in web environment.");
        return { skipped: true, reason: "Web environment" };
      },
      validateToken: async () => {
        const token = await getDbToken();
        if (!token) return { valid: false };
        try {
          const response = await fetch(
            "https://auth.stabilityprotocol.com/v1/auth/is-authorized",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (response.status === 401) {
            await setDbToken(null);
            return { valid: false };
          }
          if (!response.ok) return { valid: true };
          const data = (await response.json()) as { ok: boolean };
          return { valid: data.ok === true };
        } catch {
          return { valid: true };
        }
      },
      attachDownloadsFolder: async () => {
        console.warn("attachDownloadsFolder is not supported in web environment.");
        return { success: false, error: "Not supported in web environment" };
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
      getHistory: async (_markId: string) => {
        // Web environment: show recent global history from shared DB
        try {
          const rows = await dbQuery(
            `SELECT id, path, hash, event_type, timestamp
             FROM file_history
             ORDER BY timestamp DESC
             LIMIT 50`
          );
          return rows;
        } catch (err) {
          console.error("getHistory (web) failed:", err);
          return [];
        }
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
      me: async () => null,
      marks: async () => {
        const token = await getDbToken();
        if (!token) return [];
        const email = await webGetAuthorizedUser(token);
        if (!email) return [];
        return fetchUserMarks(email, token);
      },
      health: async () => {
        return { status: "ok", version: "1.0.0" };
      },
      userProfile: async (email: string) => {
        const token = await getDbToken();
        if (!token) return null;
        return fetchUserProfile(email, token);
      },
      userMarks: async (email: string) => {
        const token = await getDbToken();
        if (!token) return [];
        return fetchUserMarks(email, token);
      },
      organizationMarks: async (orgId: string) => {
        const token = await getDbToken();
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
