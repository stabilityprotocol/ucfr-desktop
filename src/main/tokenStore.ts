import Store from 'electron-store';

type TokenRecord = {
  token?: string;
};

const tokenStore = new Store<TokenRecord>({
  name: 'auth-token',
  defaults: {}
});

export const tokenManager = {
  async getToken(): Promise<string | null> {
    return tokenStore.get('token') || null;
  },
  async setToken(token: string): Promise<void> {
    tokenStore.set('token', token);
  },
  async clear(): Promise<void> {
    tokenStore.delete('token');
  }
};
