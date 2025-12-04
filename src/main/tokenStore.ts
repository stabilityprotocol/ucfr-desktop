import Store from "electron-store";
import { configStore } from "./configStore";

type TokenRecord = {
  token?: string;
};

const LEGACY_TOKEN_KEY = "token";
const CONFIG_TOKEN_KEY = "auth.token";

const legacyTokenStore = new Store<TokenRecord>({
  name: "auth-token",
  defaults: {},
});

async function migrateLegacyTokenIfNeeded(): Promise<string | null> {
  // If token already in config table, just use it
  const configToken = await configStore.get(CONFIG_TOKEN_KEY);
  if (configToken) {
    return configToken;
  }

  // Otherwise, check legacy electron-store and migrate
  const legacyToken = legacyTokenStore.get(LEGACY_TOKEN_KEY) || null;
  if (!legacyToken) return null;

  await configStore.set(CONFIG_TOKEN_KEY, legacyToken);
  legacyTokenStore.delete(LEGACY_TOKEN_KEY);
  return legacyToken;
}

export const tokenManager = {
  async getToken(): Promise<string | null> {
    const token = await configStore.get(CONFIG_TOKEN_KEY);
    if (token) return token;
    return migrateLegacyTokenIfNeeded();
  },

  async setToken(token: string): Promise<void> {
    await configStore.set(CONFIG_TOKEN_KEY, token);
    legacyTokenStore.delete(LEGACY_TOKEN_KEY);
  },

  async clear(): Promise<void> {
    await configStore.delete(CONFIG_TOKEN_KEY);
    legacyTokenStore.delete(LEGACY_TOKEN_KEY);
  },
};

