import Store from "electron-store";

type TokenRecord = {
  token?: string;
};

const TOKEN_KEY = "token";

const tokenStore = new Store<TokenRecord>({
  name: "auth-token",
  defaults: {},
});

export const tokenManager = {
  async getToken(): Promise<string | null> {
    return tokenStore.get(TOKEN_KEY) || null;
  },

  async setToken(token: string): Promise<void> {
    tokenStore.set(TOKEN_KEY, token);
  },

  async clear(): Promise<void> {
    tokenStore.delete(TOKEN_KEY);
  },
};
