import { getUserToken, setUserToken, clearUserToken, getCurrentUser } from "./db";

export const tokenManager = {
  async getToken(): Promise<string | null> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return null;
    }

    return getUserToken();
  },

  async setToken(token: string): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn('[token] No current user set, skipping token persistence');
      return;
    }

    await setUserToken(token);
  },

  async clear(): Promise<void> {
    try {
      await clearUserToken();
    } catch {
      console.log('[token] No current user set during clear');
    }
  },
};
