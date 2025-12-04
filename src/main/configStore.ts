import { dbQuery } from "./db";

const CONFIG_TABLE = "config";

type ConfigRow = {
  key: string;
  value: string;
  created_at: number;
  updated_at: number;
};

async function getConfigRow(key: string): Promise<ConfigRow | null> {
  const rows = await dbQuery<ConfigRow>(
    `SELECT key, value, created_at, updated_at FROM ${CONFIG_TABLE} WHERE key = $1`,
    [key]
  );
  return rows[0] ?? null;
}

async function setConfigRow(key: string, value: string): Promise<void> {
  const now = Date.now();
  await dbQuery(
    `
      INSERT INTO ${CONFIG_TABLE} (key, value, created_at, updated_at)
      VALUES ($1, $2, $3, $3)
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `,
    [key, value, now]
  );
}

async function deleteConfigRow(key: string): Promise<void> {
  await dbQuery(`DELETE FROM ${CONFIG_TABLE} WHERE key = $1`, [key]);
}

export const configStore = {
  async get(key: string): Promise<string | null> {
    const row = await getConfigRow(key);
    return row ? row.value : null;
  },

  async set(key: string, value: string): Promise<void> {
    await setConfigRow(key, value);
  },

  async delete(key: string): Promise<void> {
    await deleteConfigRow(key);
  },
};
