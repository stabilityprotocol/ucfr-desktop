import { and, eq } from "drizzle-orm";
import { getDb } from "../client";
import { files } from "../schema";

export type FileRow = {
  id: number;
  path: string;
  current_hash: string;
};

function toFileRow(row: { id: number; path: string; currentHash: string | null }): FileRow {
  return {
    id: row.id,
    path: row.path,
    current_hash: row.currentHash ?? "",
  };
}

export function getFileByPathForUser(userEmail: string, filePath: string): FileRow | null {
  const row = getDb()
    .select({ id: files.id, path: files.path, currentHash: files.currentHash })
    .from(files)
    .where(and(eq(files.userEmail, userEmail), eq(files.path, filePath)))
    .get();

  if (!row) {
    return null;
  }

  return toFileRow(row);
}

export function getFileByHashForUser(userEmail: string, hash: string): FileRow | null {
  const row = getDb()
    .select({ id: files.id, path: files.path, currentHash: files.currentHash })
    .from(files)
    .where(and(eq(files.userEmail, userEmail), eq(files.currentHash, hash)))
    .limit(1)
    .get();

  if (!row) {
    return null;
  }

  return toFileRow(row);
}

export function getSubmittedFileByHashForUser(userEmail: string, hash: string): FileRow | null {
  const row = getDb()
    .select({ id: files.id, path: files.path, currentHash: files.currentHash })
    .from(files)
    .where(and(eq(files.userEmail, userEmail), eq(files.currentHash, hash), eq(files.submitted, 1)))
    .limit(1)
    .get();

  if (!row) {
    return null;
  }

  return toFileRow(row);
}

export function upsertFileForUser(
  userEmail: string,
  filePath: string,
  hash: string,
  timestamp: number,
): { id: number } {
  const existingByHash = getDb()
    .select({ id: files.id, path: files.path })
    .from(files)
    .where(and(eq(files.userEmail, userEmail), eq(files.currentHash, hash)))
    .get();

  if (existingByHash && existingByHash.path !== filePath) {
    getDb().update(files).set({ path: filePath, updatedAt: timestamp }).where(eq(files.id, existingByHash.id)).run();
    return { id: existingByHash.id };
  }

  getDb()
    .insert(files)
    .values({
      userEmail,
      path: filePath,
      currentHash: hash,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [files.userEmail, files.path],
      set: {
        currentHash: hash,
        updatedAt: timestamp,
      },
    })
    .run();

  const row = getDb()
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.userEmail, userEmail), eq(files.path, filePath)))
    .get();

  if (!row) {
    throw new Error("Failed to upsert file");
  }

  return row;
}

export function updateFilePathById(fileId: number, newPath: string, timestamp: number): void {
  getDb().update(files).set({ path: newPath, updatedAt: timestamp }).where(eq(files.id, fileId)).run();
}

export function markFileAsSubmittedForUser(userEmail: string, hash: string): void {
  getDb().update(files).set({ submitted: 1 }).where(and(eq(files.userEmail, userEmail), eq(files.currentHash, hash))).run();
}
