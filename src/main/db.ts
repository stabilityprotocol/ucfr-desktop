import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const dbDir = path.join(os.homedir(), ".ucfr-desktop");
const dbPath = path.join(dbDir, "app.db");

// Module-level variables for database and current user
let db: sqlite3.Database | null = null;
let currentUserEmail: string | null = null;

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Clean up old PGlite data if it exists (fresh start migration)
const oldPgliteDir = path.join(os.homedir(), ".ucfr-pglite");
if (fs.existsSync(oldPgliteDir)) {
  console.log("[db] Cleaning up old PGlite data...");
  try {
    fs.rmSync(oldPgliteDir, { recursive: true, force: true });
    console.log("[db] Old PGlite data removed");
  } catch (e) {
    console.error("[db] Failed to remove old PGlite data:", e);
  }
}

function getDb(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err: Error | null) => {
      if (err) {
        console.error("[db] Error opening database:", err);
      } else {
        console.log(`[db] SQLite database opened: ${dbPath}`);
      }
    });
    // Enable WAL mode for better performance
    db.run("PRAGMA journal_mode = WAL;");
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  // Create tables
  database.serialize(() => {
    // Create users table
    database.run(`
      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        token TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Migration: add `token` column to existing databases that lack it
    database.run(
      `ALTER TABLE users ADD COLUMN token TEXT`,
      (err: Error | null) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("[db] Error adding token column:", err);
        }
      }
    );

    // Create files table (per-user)
    // `submitted` tracks whether the file hash has been successfully sent to the API.
    // 0 = tracked locally but not yet submitted, 1 = successfully submitted to API.
    // This prevents the race condition where fileHistory records a hash before
    // artifactService checks for it, causing the dedup check to always skip submission.
    database.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        path TEXT NOT NULL,
        current_hash TEXT,
        submitted INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE,
        UNIQUE(user_email, path)
      );
    `);

    // Migration: add `submitted` column to existing databases that lack it.
    // ALTER TABLE ... ADD COLUMN is a no-op if the column already exists in SQLite,
    // so we wrap it in a try/catch to handle the "duplicate column name" error gracefully.
    database.run(
      `ALTER TABLE files ADD COLUMN submitted INTEGER NOT NULL DEFAULT 0`,
      (err: Error | null) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("[db] Error adding submitted column:", err);
        }
      }
    );

    // Create file_history table (per-user)
    database.run(`
      CREATE TABLE IF NOT EXISTS file_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        file_id INTEGER,
        path TEXT NOT NULL,
        hash TEXT,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE,
        FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
      );
    `);

    // Create config table (per-user key-value)
    database.run(`
      CREATE TABLE IF NOT EXISTS config (
        user_email TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY(user_email, key),
        FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE
      );
    `);

    // Create watched_folders table (per-user, per-mark)
    database.run(`
      CREATE TABLE IF NOT EXISTS watched_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        mark_id TEXT NOT NULL,
        folder_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE,
        UNIQUE(user_email, mark_id, folder_path)
      );
    `);

    // Create indexes
    database.run(`CREATE INDEX IF NOT EXISTS idx_files_user_email ON files(user_email);`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_file_history_user_email ON file_history(user_email);`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_file_history_file_id ON file_history(file_id);`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_file_history_timestamp ON file_history(timestamp);`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_config_user_email ON config(user_email);`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_watched_folders_user_email ON watched_folders(user_email);`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_watched_folders_mark_id ON watched_folders(mark_id);`);
    
    // Add unique constraint on hash per user to prevent duplicates
    database.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_files_user_hash ON files(user_email, current_hash);`);
    
    // Add unique constraint on file_history to prevent duplicate hash entries per user/file
    database.run(`DROP INDEX IF EXISTS idx_file_history_unique;`);
    database.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_file_history_user_file_hash ON file_history(user_email, file_id, hash);`);
  });

  console.log("[db] Database initialized with schema");
}

export function setCurrentUser(email: string | null): void {
  if (email === currentUserEmail) return;

  currentUserEmail = email;
  console.log(`[db] Current user set to: ${email ?? "null"}`);

  if (email) {
    // Ensure user exists in users table
    const database = getDb();
    const now = Date.now();
    database.run(
      `INSERT OR IGNORE INTO users (email, created_at, updated_at) VALUES (?, ?, ?)`,
      [email, now, now]
    );
  }
}

export function getCurrentUser(): string | null {
  return currentUserEmail;
}

function ensureUser(): string {
  if (!currentUserEmail) {
    throw new Error("No current user set. Call setCurrentUser(email) first.");
  }
  return currentUserEmail;
}

// Promisified database operations
function runAsync(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(sql, params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function allAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.get(sql, params, (err: Error | null, row: T | undefined) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function dbExec(sql: string, params?: unknown[]): void {
  const database = getDb();
  database.run(sql, params ?? []);
}

export function dbQuery<T = unknown>(sql: string, params?: unknown[]): T[] {
  const database = getDb();
  const results: T[] = [];
  database.all(sql, params ?? [], (err: Error | null, rows: T[]) => {
    if (err) {
      console.error("[db] Query error:", err);
    } else {
      results.push(...rows);
    }
  });
  // Note: This is a synchronous wrapper that won't work properly
  // For true async, use the async functions below
  return results;
}

// Async versions for proper database operations
export async function dbExecAsync(sql: string, params?: unknown[]): Promise<void> {
  await runAsync(sql, params);
}

export async function dbQueryAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  return allAsync<T>(sql, params);
}

// Config store helpers (with user context)
export async function getConfigValue(key: string): Promise<string | null> {
  const userEmail = ensureUser();
  const row = await getAsync<{ value: string }>(
    `SELECT value FROM config WHERE user_email = ? AND key = ?`,
    [userEmail, key]
  );
  return row?.value ?? null;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  const userEmail = ensureUser();
  const now = Date.now();
  await runAsync(
    `INSERT INTO config (user_email, key, value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_email, key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [userEmail, key, value, now, now]
  );
}

export async function deleteConfigValue(key: string): Promise<void> {
  const userEmail = ensureUser();
  await runAsync(
    `DELETE FROM config WHERE user_email = ? AND key = ?`,
    [userEmail, key]
  );
}

// File history helpers (with user context)
export async function getFileByPath(path: string): Promise<{ id: number; path: string; current_hash: string } | null> {
  const userEmail = ensureUser();
  return getAsync<{ id: number; path: string; current_hash: string }>(
    `SELECT id, path, current_hash FROM files WHERE user_email = ? AND path = ?`,
    [userEmail, path]
  );
}

export async function getFileByHash(hash: string): Promise<{ id: number; path: string; current_hash: string } | null> {
  const userEmail = ensureUser();
  return getAsync<{ id: number; path: string; current_hash: string }>(
    `SELECT id, path, current_hash FROM files WHERE user_email = ? AND current_hash = ? LIMIT 1`,
    [userEmail, hash]
  );
}

export async function upsertFile(filePath: string, hash: string, timestamp: number): Promise<{ id: number }> {
  const userEmail = ensureUser();
  
  // Check if this hash already exists for this user (duplicate detection)
  const existingByHash = await getAsync<{ id: number; path: string }>(
    `SELECT id, path FROM files WHERE user_email = ? AND current_hash = ?`,
    [userEmail, hash]
  );
  
  if (existingByHash && existingByHash.path !== filePath) {
    // Hash exists at different path - update path to new location
    await runAsync(
      `UPDATE files SET path = ?, updated_at = ? WHERE id = ?`,
      [filePath, timestamp, existingByHash.id]
    );
    return { id: existingByHash.id };
  }
  
  // Normal upsert on path
  await runAsync(
    `INSERT INTO files (user_email, path, current_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_email, path) DO UPDATE SET
       current_hash = excluded.current_hash,
       updated_at = excluded.updated_at`,
    [userEmail, filePath, hash, timestamp, timestamp]
  );
  
  // Get the ID after upsert
  const row = await getAsync<{ id: number }>(
    `SELECT id FROM files WHERE user_email = ? AND path = ?`,
    [userEmail, filePath]
  );
  if (!row) throw new Error("Failed to upsert file");
  return row;
}

export async function updateFilePath(fileId: number, newPath: string, timestamp: number): Promise<void> {
  await runAsync(
    `UPDATE files SET path = ?, updated_at = ? WHERE id = ?`,
    [newPath, timestamp, fileId]
  );
}

export async function insertFileHistory(fileId: number | null, filePath: string, hash: string, eventType: string, timestamp: number): Promise<void> {
  const userEmail = ensureUser();
  await runAsync(
    `INSERT INTO file_history (user_email, file_id, path, hash, event_type, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_email, file_id, hash) DO NOTHING`,
    [userEmail, fileId, filePath, hash, eventType, timestamp]
  );
}

export async function getFileHistoryForFolders(folders: string[], limit: number, offset: number): Promise<unknown[]> {
  const userEmail = ensureUser();

  if (folders.length === 0) return [];

  // Build LIKE conditions for each folder
  const conditions = folders.map(() => "path LIKE ?").join(" OR ");
  const likePatterns = folders.map((f) => `${f}%`);

  return allAsync(
    `SELECT * FROM file_history
     WHERE user_email = ? AND (${conditions})
     ORDER BY timestamp DESC
     LIMIT ? OFFSET ?`,
    [userEmail, ...likePatterns, limit, offset]
  );
}

export async function getFileHistoryCountForFolders(folders: string[]): Promise<number> {
  const userEmail = ensureUser();

  if (folders.length === 0) return 0;

  const conditions = folders.map(() => "path LIKE ?").join(" OR ");
  const likePatterns = folders.map((f) => `${f}%`);

  const row = await getAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM file_history
     WHERE user_email = ? AND (${conditions})`,
    [userEmail, ...likePatterns]
  );
  return row?.count ?? 0;
}

export async function getPreviousFileHash(fileId: number, currentHash: string): Promise<string | null> {
  const row = await getAsync<{ hash: string }>(
    `SELECT hash FROM file_history
     WHERE file_id = ? AND hash != ?
     ORDER BY timestamp DESC, id DESC
     LIMIT 1`,
    [fileId, currentHash]
  );
  return row?.hash ?? null;
}

/**
 * getSubmittedFileByHash - Returns a file record only if it has been successfully
 * submitted to the API (submitted = 1). Used by artifactService to decide whether
 * to skip a file that has already been claimed on the backend.
 * This is distinct from getFileByHash() which returns any tracked file regardless
 * of submission status (used by fileHistory for move/rename detection).
 */
export async function getSubmittedFileByHash(hash: string): Promise<{ id: number; path: string; current_hash: string } | null> {
  const userEmail = ensureUser();
  return getAsync<{ id: number; path: string; current_hash: string }>(
    `SELECT id, path, current_hash FROM files WHERE user_email = ? AND current_hash = ? AND submitted = 1 LIMIT 1`,
    [userEmail, hash]
  );
}

/**
 * markFileAsSubmitted - Sets the submitted flag to 1 for a file record matching
 * the given hash. Called by artifactService after a successful API submission
 * so that future detections of the same hash are correctly skipped.
 */
export async function markFileAsSubmitted(hash: string): Promise<void> {
  const userEmail = ensureUser();
  await runAsync(
    `UPDATE files SET submitted = 1 WHERE user_email = ? AND current_hash = ?`,
    [userEmail, hash]
  );
}

/**
 * Deletes all user data from the database (files, file_history, config, watched_folders, users).
 * Called during logout to ensure the next user starts with a clean slate.
 * Note: tokens are stored in the users table and are cleared when users are deleted.
 */
export async function clearAllUserData(): Promise<void> {
  // Delete in order respecting foreign key constraints
  await runAsync(`DELETE FROM file_history`);
  await runAsync(`DELETE FROM files`);
  await runAsync(`DELETE FROM config`);
  await runAsync(`DELETE FROM watched_folders`);
  await runAsync(`DELETE FROM users`);
  currentUserEmail = null;
  console.log("[db] All user data cleared");
}

// Watched folders helpers (with user context)
export async function getWatchedFoldersForMark(markId: string): Promise<string[]> {
  const userEmail = ensureUser();
  const rows = await allAsync<{ folder_path: string }>(
    `SELECT folder_path FROM watched_folders 
     WHERE user_email = ? AND mark_id = ? 
     ORDER BY folder_path`,
    [userEmail, markId]
  );
  return rows.map(r => r.folder_path);
}

export async function getAllWatchedFolders(): Promise<Record<string, string[]>> {
  const userEmail = ensureUser();
  const rows = await allAsync<{ mark_id: string; folder_path: string }>(
    `SELECT mark_id, folder_path FROM watched_folders 
     WHERE user_email = ? 
     ORDER BY mark_id, folder_path`,
    [userEmail]
  );
  
  const result: Record<string, string[]> = {};
  for (const row of rows) {
    if (!result[row.mark_id]) {
      result[row.mark_id] = [];
    }
    result[row.mark_id].push(row.folder_path);
  }
  return result;
}

export async function addWatchedFolder(markId: string, folderPath: string): Promise<void> {
  const userEmail = ensureUser();
  const now = Date.now();
  await runAsync(
    `INSERT INTO watched_folders (user_email, mark_id, folder_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_email, mark_id, folder_path) DO UPDATE SET
       updated_at = excluded.updated_at`,
    [userEmail, markId, folderPath, now, now]
  );
}

export async function removeWatchedFolder(markId: string, folderPath: string): Promise<void> {
  const userEmail = ensureUser();
  await runAsync(
    `DELETE FROM watched_folders 
     WHERE user_email = ? AND mark_id = ? AND folder_path = ?`,
    [userEmail, markId, folderPath]
  );
}

export async function removeAllWatchedFoldersForMark(markId: string): Promise<void> {
  const userEmail = ensureUser();
  await runAsync(
    `DELETE FROM watched_folders 
     WHERE user_email = ? AND mark_id = ?`,
    [userEmail, markId]
  );
}

export async function setWatchedFoldersForMark(markId: string, folderPaths: string[]): Promise<void> {
  const userEmail = ensureUser();
  const now = Date.now();
  
  // Start a transaction
  const database = getDb();
  
  return new Promise((resolve, reject) => {
    database.run("BEGIN TRANSACTION", async (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        // Delete existing folders for this mark
        await runAsync(
          `DELETE FROM watched_folders 
           WHERE user_email = ? AND mark_id = ?`,
          [userEmail, markId]
        );
        
        // Insert new folders
        for (const folderPath of folderPaths) {
          await runAsync(
            `INSERT INTO watched_folders (user_email, mark_id, folder_path, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [userEmail, markId, folderPath, now, now]
          );
        }
        
        database.run("COMMIT", (commitErr) => {
          if (commitErr) {
            reject(commitErr);
          } else {
            resolve();
          }
        });
      } catch (error) {
        database.run("ROLLBACK", () => {
          reject(error);
        });
      }
    });
  });
}

export async function findMarkForFilePath(filePath: string): Promise<string | null> {
  const userEmail = ensureUser();
  
  // Find all watched folders for this user
  const rows = await allAsync<{ mark_id: string; folder_path: string }>(
    `SELECT mark_id, folder_path FROM watched_folders 
     WHERE user_email = ?`,
    [userEmail]
  );
  
  // Find the mark where the file path starts with the folder path
  for (const row of rows) {
    if (filePath.startsWith(row.folder_path)) {
      return row.mark_id;
    }
  }
  
  return null;
}

// Token management helpers (with user context)
export async function getUserToken(): Promise<string | null> {
  const userEmail = ensureUser();
  const row = await getAsync<{ token: string | null }>(
    `SELECT token FROM users WHERE email = ?`,
    [userEmail]
  );
  return row?.token ?? null;
}

export async function setUserToken(token: string): Promise<void> {
  const userEmail = ensureUser();
  const now = Date.now();
  await runAsync(
    `UPDATE users SET token = ?, updated_at = ? WHERE email = ?`,
    [token, now, userEmail]
  );
}

export async function clearUserToken(): Promise<void> {
  const userEmail = ensureUser();
  const now = Date.now();
  await runAsync(
    `UPDATE users SET token = NULL, updated_at = ? WHERE email = ?`,
    [now, userEmail]
  );
}

export function closeDb(): void {
  if (db) {
    db.close((err: Error | null) => {
      if (err) {
        console.error("[db] Error closing database:", err);
      } else {
        console.log("[db] Database connection closed");
      }
    });
    db = null;
  }
}
