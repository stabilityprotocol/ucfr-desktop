import fs from "fs";
import crypto from "crypto";
import { dbQuery, dbExec } from "./db";

interface FileRecord {
  id: number;
  path: string;
  current_hash: string;
}

export class FileHistoryService {
  private pendingRenames: Map<string, { hash: string; timestamp: number }> =
    new Map();
  private renameWindowMs = 1000; // Time window to match unlink+add as rename

  constructor() {
    // Clean up old pending renames periodically
    setInterval(() => this.cleanupPendingRenames(), 5000);
  }

  private cleanupPendingRenames() {
    const now = Date.now();
    for (const [path, data] of this.pendingRenames.entries()) {
      if (now - data.timestamp > this.renameWindowMs) {
        // Expired, treat as real delete if we were tracking deletes,
        // but for now we just forget it as a rename candidate.
        // If we wanted to track deletes, we'd log it here.
        this.pendingRenames.delete(path);
      }
    }
  }

  private calculateHash(filePath: string): string | null {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash("sha256");
      hashSum.update(fileBuffer);
      return `0x${hashSum.digest("hex")}`;
    } catch (error) {
      console.error(`[FileHistory] Error hashing file ${filePath}:`, error);
      return null;
    }
  }

  async handleEvent(event: string, filePath: string) {
    const now = Date.now();
    console.log(`[FileHistory] Processing ${event} for ${filePath}`);

    if (event === "unlink") {
      // File removed. We need to know its hash to detect renames.
      // We look up the file in the DB.
      const rows = await dbQuery<FileRecord>(
        "SELECT * FROM files WHERE path = $1",
        [filePath]
      );
      const file = rows[0];

      if (file) {
        this.pendingRenames.set(filePath, {
          hash: file.current_hash,
          timestamp: now,
        });
      }
      return;
    }

    if (event === "add" || event === "change") {
      const hash = this.calculateHash(filePath);
      if (!hash) return; // Could not read file

      // Check if this is a rename (only on 'add')
      if (event === "add") {
        const renamedFrom = this.findRenamedSource(hash);
        if (renamedFrom) {
          await this.processRename(renamedFrom, filePath, hash, now);
          return;
        }
      }

      // Normal Add or Change
      await this.processAddOrChange(filePath, hash, event, now);
    }
  }

  private findRenamedSource(hash: string): string | null {
    for (const [oldPath, data] of this.pendingRenames.entries()) {
      if (data.hash === hash) {
        return oldPath;
      }
    }
    return null;
  }

  private async processRename(
    oldPath: string,
    newPath: string,
    hash: string,
    timestamp: number
  ) {
    console.log(`[FileHistory] Detected RENAME: ${oldPath} -> ${newPath}`);

    const rows = await dbQuery<FileRecord>(
      "SELECT * FROM files WHERE path = $1",
      [oldPath]
    );
    const file = rows[0];

    if (file) {
      await dbExec(
        "UPDATE files SET path = $1, updated_at = $2 WHERE id = $3",
        [newPath, Math.floor(timestamp / 1000), file.id]
      );

      await dbExec(
        `
        INSERT INTO file_history (file_id, path, hash, event_type, timestamp)
        VALUES ($1, $2, $3, 'rename', $4)
      `,
        [file.id, newPath, hash, Math.floor(timestamp / 1000)]
      );

      this.pendingRenames.delete(oldPath);
    } else {
      // Should not happen if pendingRenames is consistent
      await this.processAddOrChange(newPath, hash, "add", timestamp);
    }
  }

  async getHistoryForFolders(folders: string[], limit: number = 50) {
    if (folders.length === 0) return [];

    // Simple LIKE queries for each folder
    const conditions = folders
      .map((_, i) => `path LIKE $${i + 1}`)
      .join(" OR ");
    // Ensure folders end with separator to avoid partial matches on similar folder names
    // But we also want to match the folder itself? valid paths usually have files inside.
    const params = folders.map((f) => `${f}%`);

    // We can't use dynamic number of params easily if db.query expects a fixed string literal or specific format?
    // PGlite query uses standard postgres parameterization.

    try {
      const rows = await dbQuery(
        `SELECT * FROM file_history 
         WHERE ${conditions}
         ORDER BY timestamp DESC
         LIMIT $${folders.length + 1}`,
        [...params, limit]
      );
      return rows;
    } catch (e) {
      console.error("[FileHistory] Error getting history:", e);
      return [];
    }
  }

  async getPreviousHash(
    filePath: string,
    currentRealHash: string
  ): Promise<string | null> {
    try {
      const rows = await dbQuery<FileRecord>(
        "SELECT * FROM files WHERE path = $1",
        [filePath]
      );
      const file = rows[0];

      if (!file) {
        // New file or not tracked yet.
        return null;
      }

      let storedHash = file.current_hash;
      if (!storedHash.startsWith("0x")) {
        storedHash = `0x${storedHash}`;
      }

      // If DB is not yet updated to the new hash
      if (storedHash !== currentRealHash) {
        return storedHash;
      }

      // If DB is already updated, look for previous history
      const historyRows = await dbQuery<{ hash: string }>(
        `SELECT hash FROM file_history 
           WHERE file_id = $1 AND hash != $2
           ORDER BY timestamp DESC, id DESC
           LIMIT 1`,
        [file.id, currentRealHash]
      );

      let historyHash = historyRows[0]?.hash || null;
      if (historyHash && !historyHash.startsWith("0x")) {
        historyHash = `0x${historyHash}`;
      }
      return historyHash;
    } catch (e) {
      console.error(
        `[FileHistory] Error getting previous hash for ${filePath}:`,
        e
      );
      return null;
    }
  }

  async getFileByHash(hash: string): Promise<FileRecord | null> {
    try {
      const rows = await dbQuery<FileRecord>(
        "SELECT * FROM files WHERE current_hash = $1 LIMIT 1",
        [hash]
      );
      return rows[0] || null;
    } catch (e) {
      console.error(
        `[FileHistory] Error getting file by hash ${hash}:`,
        e
      );
      return null;
    }
  }

  private async processAddOrChange(
    filePath: string,
    hash: string,
    event: string,
    timestamp: number
  ) {
    const rows = await dbQuery<FileRecord>(
      "SELECT * FROM files WHERE path = $1",
      [filePath]
    );
    const existingFile = rows[0];

    let fileId: number;

    if (existingFile) {
      fileId = existingFile.id;
      if (existingFile.current_hash !== hash) {
        await dbExec(
          "UPDATE files SET current_hash = $1, updated_at = $2 WHERE id = $3",
          [hash, Math.floor(timestamp / 1000), fileId]
        );

        await dbExec(
          `
                INSERT INTO file_history (file_id, path, hash, event_type, timestamp)
                VALUES ($1, $2, $3, 'change', $4)
            `,
          [fileId, filePath, hash, Math.floor(timestamp / 1000)]
        );
      }
    } else {
      // Use UPSERT to handle race conditions gracefully
      const insertRows = await dbQuery<{ id: number }>(
        `INSERT INTO files (path, current_hash, created_at, updated_at) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (path) DO UPDATE SET 
           current_hash = EXCLUDED.current_hash,
           updated_at = EXCLUDED.updated_at
         RETURNING id`,
        [
          filePath,
          hash,
          Math.floor(timestamp / 1000),
          Math.floor(timestamp / 1000),
        ]
      );
      fileId = insertRows[0].id;

      await dbExec(
        `
            INSERT INTO file_history (file_id, path, hash, event_type, timestamp)
            VALUES ($1, $2, $3, 'add', $4)
        `,
        [fileId, filePath, hash, Math.floor(timestamp / 1000)]
      );
    }
  }
}

export const fileHistoryService = new FileHistoryService();
