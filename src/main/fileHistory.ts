import fs from "fs";
import crypto from "crypto";
import {
  getFileByPath,
  getFileByHash,
  upsertFile,
  updateFilePath,
  insertFileHistory,
  getFileHistoryForFolders,
  getFileHistoryCountForFolders,
  getPreviousFileHash,
} from "./db";

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
      const file = await getFileByPath(filePath);

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

    const file = await getFileByPath(oldPath);

    if (file) {
      await updateFilePath(file.id, newPath, Math.floor(timestamp / 1000));

      await insertFileHistory(
        file.id,
        newPath,
        hash,
        "rename",
        Math.floor(timestamp / 1000)
      );

      this.pendingRenames.delete(oldPath);
    } else {
      // Should not happen if pendingRenames is consistent
      await this.processAddOrChange(newPath, hash, "add", timestamp);
    }
  }

  async getHistoryForFolders(
    folders: string[],
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ items: unknown[]; total: number }> {
    if (folders.length === 0) return { items: [], total: 0 };

    const offset = (page - 1) * pageSize;

    try {
      const [total, items] = await Promise.all([
        getFileHistoryCountForFolders(folders),
        getFileHistoryForFolders(folders, pageSize, offset),
      ]);

      return { items, total };
    } catch (e) {
      console.error("[FileHistory] Error getting history:", e);
      return { items: [], total: 0 };
    }
  }

  async getPreviousHash(
    filePath: string,
    currentRealHash: string
  ): Promise<string | null> {
    try {
      const file = await getFileByPath(filePath);

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
      const historyHash = await getPreviousFileHash(file.id, currentRealHash);

      if (historyHash && !historyHash.startsWith("0x")) {
        return `0x${historyHash}`;
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
      return getFileByHash(hash);
    } catch (e) {
      console.error(`[FileHistory] Error getting file by hash ${hash}:`, e);
      return null;
    }
  }

  private async processAddOrChange(
    filePath: string,
    hash: string,
    event: string,
    timestamp: number
  ) {
    const existingFile = await getFileByPath(filePath);

    let fileId: number;

    if (existingFile) {
      fileId = existingFile.id;
      if (existingFile.current_hash !== hash) {
        await upsertFile(filePath, hash, Math.floor(timestamp / 1000));

        await insertFileHistory(
          fileId,
          filePath,
          hash,
          "change",
          Math.floor(timestamp / 1000)
        );
      }
    } else {
      // Use UPSERT to handle race conditions gracefully
      const result = await upsertFile(filePath, hash, Math.floor(timestamp / 1000));
      fileId = result.id;

      await insertFileHistory(fileId, filePath, hash, "add", Math.floor(timestamp / 1000));
    }
  }
}

export const fileHistoryService = new FileHistoryService();
