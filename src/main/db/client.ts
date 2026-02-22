import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const dbDir = path.join(os.homedir(), ".ucfr-desktop");
export const dbPath = path.join(dbDir, "ucfr-drizzle.db");
const resetMarkerPath = path.join(dbDir, ".drizzle-hard-reset-v1");

let sqlite: Database.Database | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function ensureDbDir(): void {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

export function hardResetLegacyDbOnce(): void {
  ensureDbDir();
  if (fs.existsSync(resetMarkerPath)) {
    return;
  }

  const legacyDbPath = path.join(dbDir, "app.db");
  const legacyFiles = [legacyDbPath, `${legacyDbPath}-wal`, `${legacyDbPath}-shm`];
  for (const filePath of legacyFiles) {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
      console.log(`[db] Removed legacy SQLite file: ${filePath}`);
    }
  }

  fs.writeFileSync(resetMarkerPath, `${Date.now()}`, "utf-8");
  console.log("[db] Hard reset marker created");
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    ensureDbDir();
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
  }
  return sqlite;
}

export function getDb() {
  if (!drizzleDb) {
    drizzleDb = drizzle(getSqlite(), { schema });
  }
  return drizzleDb;
}

export function closeSqlite(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    drizzleDb = null;
  }
}
