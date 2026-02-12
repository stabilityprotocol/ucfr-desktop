import { getConfigValue, setConfigValue, deleteConfigValue } from "./db";

export const configStore = {
  async get(key: string): Promise<string | null> {
    return getConfigValue(key);
  },

  async set(key: string, value: string): Promise<void> {
    setConfigValue(key, value);
  },

  async delete(key: string): Promise<void> {
    deleteConfigValue(key);
  },
};
