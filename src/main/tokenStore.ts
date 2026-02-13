import Store from "electron-store";
import { getUserToken, setUserToken, clearUserToken, getCurrentUser } from "./db";

type TokenRecord = {
  token?: string;
};

const TOKEN_KEY = "token";

// Legacy token store for migration purposes
const tokenStore = new Store<TokenRecord>({
  name: "auth-token",
  defaults: {},
});

/**
 * Migrates token from electron-store to the SQLite database.
 * This is a one-time migration that runs when a user logs in.
 * After migration, the token is removed from electron-store.
 */
export async function migrateTokenToDb(): Promise<void> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.log('[token] Cannot migrate token: no current user set');
    return;
  }

  const legacyToken = tokenStore.get(TOKEN_KEY);
  if (!legacyToken) {
    return;
  }

  // Check if user already has a token in database
  const existingToken = await getUserToken();
  if (existingToken) {
    // User already has a token in DB, just clean up the legacy store
    tokenStore.delete(TOKEN_KEY);
    console.log('[token] Token already exists in database, removed from legacy store');
    return;
  }

  console.log('[token] Migrating token to database...');
  try {
    await setUserToken(legacyToken);
    tokenStore.delete(TOKEN_KEY);
    console.log('[token] Token migration complete. Removed from legacy store.');
  } catch (error) {
    console.error('[token] Token migration failed:', error);
  }
}

export const tokenManager = {
  async getToken(): Promise<string | null> {
    // First try to get from database (current user context)
    try {
      const dbToken = await getUserToken();
      if (dbToken) {
        return dbToken;
      }
    } catch (error) {
      // No current user set yet, fall back to legacy store
      console.log('[token] No current user set, using legacy store');
    }

    // Fallback to legacy store for backward compatibility or when no user is set
    return tokenStore.get(TOKEN_KEY) || null;
  },

  async setToken(token: string): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn('[token] No current user set, storing in legacy store temporarily');
      tokenStore.set(TOKEN_KEY, token);
      return;
    }

    await setUserToken(token);

    // Also clear legacy store to avoid conflicts
    if (tokenStore.get(TOKEN_KEY)) {
      tokenStore.delete(TOKEN_KEY);
    }
  },

  async clear(): Promise<void> {
    // Clear from database (if user is set)
    try {
      await clearUserToken();
    } catch (error) {
      // No current user set, that's okay
      console.log('[token] No current user set during clear, only clearing legacy store');
    }

    // Also clear legacy store to be safe
    tokenStore.delete(TOKEN_KEY);
  },
};
