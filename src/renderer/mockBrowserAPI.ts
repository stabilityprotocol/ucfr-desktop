import type { RendererAPI } from "../preload";
import {
  fetchCurrentUser,
  fetchProjects,
  fetchHealth,
} from "../shared/api/mockApi";
import {
  fetchUserProfile,
  fetchUserProjects,
  fetchOrganizationProjects,
} from "../shared/api/client";

// Browser mock for window.ucfr API
export function createBrowserMock(): RendererAPI {
  let mockSettings: { folderPath?: string; autoStart?: boolean } = {};

  // Generate a random UUID for request ID
  const generateRequestId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID v4 generation
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  async function pollForToken(requestId: string): Promise<string | null> {
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
          console.error("Auth polling failed:", response.statusText);
          return null;
        }
      } catch (err) {
        console.error("Auth polling error:", err);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    return null;
  }

  async function getAuthorizedUserFromApi(): Promise<unknown | null> {
    const token = localStorage.getItem("ucfr_token");
    if (!token) return null;

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
        localStorage.removeItem("ucfr_token");
        return null;
      }

      if (!response.ok) {
        console.error("is-authorized failed:", response.statusText);
        return null;
      }

      const data = (await response.json()) as {
        ok: boolean;
        value?: {
          email: string;
          iat: number;
          exp: number;
        };
      };

      if (!data.ok) return null;
      return data.value?.email ?? null;
    } catch (err) {
      console.error("is-authorized error:", err);
      return null;
    }
  }

  return {
    auth: {
      getToken: async () => {
        return localStorage.getItem("ucfr_token");
      },
      clearToken: async () => {
        localStorage.removeItem("ucfr_token");
        window.dispatchEvent(new Event("tokenChanged"));
        return null;
      },
      startLoginFlow: async () => {
        const requestId = generateRequestId();

        void (async () => {
          const token = await pollForToken(requestId);
          if (token) {
            localStorage.setItem("ucfr_token", token);
            window.dispatchEvent(new Event("tokenChanged"));
          } else {
            console.error("Authentication timed out or failed.");
          }
        })();

        return { requestId };
      },
      getUser: async () => {
        return getAuthorizedUserFromApi();
      },
    },
    settings: {
      get: async () => {
        const stored = localStorage.getItem("ucfr_mock_settings");
        if (stored) {
          mockSettings = JSON.parse(stored);
        }
        return mockSettings;
      },
      set: async (update: Record<string, unknown>) => {
        mockSettings = { ...mockSettings, ...update };
        localStorage.setItem(
          "ucfr_mock_settings",
          JSON.stringify(mockSettings)
        );
        return mockSettings;
      },
      selectFolder: async () => {
        // In browser, just return a mock folder path
        const folderPath = "/Users/example/Documents";
        mockSettings.folderPath = folderPath;
        localStorage.setItem(
          "ucfr_mock_settings",
          JSON.stringify(mockSettings)
        );
        return folderPath;
      },
    },
    project: {
      addFolder: async (projectId: string) => {
        console.log("Mock: Adding folder for project", projectId);
        return [
          "/Users/example/ProjectFolder1",
          "/Users/example/ProjectFolder2",
        ];
      },
      removeFolder: async (projectId: string, folderPath: string) => {
        console.log(
          "Mock: Removing folder",
          folderPath,
          "for project",
          projectId
        );
        return ["/Users/example/ProjectFolder1"];
      },
      getFolders: async (projectId: string) => {
        console.log("Mock: Getting folders for project", projectId);
        return ["/Users/example/ProjectFolder1"];
      },
    },
    app: {
      toggleAutoStart: async (enable: boolean) => {
        mockSettings.autoStart = enable;
        localStorage.setItem(
          "ucfr_mock_settings",
          JSON.stringify(mockSettings)
        );
        return enable;
      },
      openExternal: async (target: string) => {
        // In browser, open in a new tab/window
        window.open(target, "_blank");
      },
    },
    sync: {
      startWatcher: async (folderPath: string) => {
        console.log("Mock: Starting watcher for", folderPath);
        return true;
      },
      onWatcherEvent: (callback: (payload: any) => void) => {
        console.log("Mock: registered watcher event listener");
        return () => console.log("Mock: unregistered watcher event listener");
      },
    },
    api: {
      me: async () => {
        return await fetchCurrentUser();
      },
      projects: async () => {
        return await fetchProjects();
      },
      health: async () => {
        return await fetchHealth();
      },
      userProfile: async (email: string) => {
        const token = localStorage.getItem("ucfr_token");
        if (!token) return null;
        return await fetchUserProfile(email, token);
      },
      userProjects: async (email: string) => {
        const token = localStorage.getItem("ucfr_token");
        if (!token) return [];
        return await fetchUserProjects(email, token);
      },
      organizationProjects: async (orgId: string) => {
        const token = localStorage.getItem("ucfr_token");
        if (!token) return [];
        return await fetchOrganizationProjects(orgId, token);
      },
    },
  };
}

// Check if running in browser mode (not Electron)
export function isBrowserMode(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).__UCFR_BROWSER_MODE__;
}

// Initialize mock API if running in browser (window.ucfr doesn't exist)
export function initBrowserMock() {
  if (typeof window !== "undefined" && !window.ucfr) {
    console.log("🌐 Browser mode: Initializing mock API");
    (window as any).__UCFR_BROWSER_MODE__ = true;
    (window as any).ucfr = createBrowserMock();
  }
}
