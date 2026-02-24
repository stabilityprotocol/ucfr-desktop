import { getUserToken, setUserToken, clearUserToken, getCurrentUser } from "./db";

export const tokenManager = {
  async getToken(): Promise<string | null> {
    const currentUser = getCurrentUser();
    console.log('[tokenManager.getToken] currentUser:', currentUser);
    if (!currentUser) {
      console.log('[tokenManager.getToken] No current user, returning null');
      return null;
    }

    const token = await getUserToken();
    console.log('[tokenManager.getToken] Retrieved token:', token ? 'exists' : 'null');
    return token;
  },

  async setToken(token: string): Promise<void> {
    const currentUser = getCurrentUser();
    console.log('[tokenManager.setToken] currentUser:', currentUser);
    if (!currentUser) {
      console.warn('[tokenManager.setToken] No current user set, skipping token persistence');
      return;
    }

    console.log('[tokenManager.setToken] Persisting token for user:', currentUser);
    await setUserToken(token);
    console.log('[tokenManager.setToken] Token persisted successfully');
  },

  async clear(): Promise<void> {
    try {
      await clearUserToken();
    } catch {
      console.log('[token] No current user set during clear');
    }
  },
};
