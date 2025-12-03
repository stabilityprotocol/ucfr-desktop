import { PGlite } from "@electric-sql/pglite";
import path from "path";
import { app } from "electron";
import fs from "fs";

// Ensure the data directory exists
const userDataPath = app.getPath("userData");
const dbDir = path.join(userDataPath, "pglite-data");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`[DB] PGlite Database path: ${dbDir}`);

// Initialize PGlite with the file system path for persistence
const db = new PGlite(dbDir);

export async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      current_hash TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      UNIQUE(path)
    );

    CREATE TABLE IF NOT EXISTS file_history (
      id SERIAL PRIMARY KEY,
      file_id INTEGER,
      path TEXT NOT NULL,
      hash TEXT,
      event_type TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
    );
  `);
}

export default db;
