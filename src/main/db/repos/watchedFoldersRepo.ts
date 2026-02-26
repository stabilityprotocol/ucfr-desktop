import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { watchedFolders } from "../schema";

export function getWatchedFoldersForMarkForUser(userEmail: string, markId: string): string[] {
  const rows = getDb()
    .select({ folderPath: watchedFolders.folderPath })
    .from(watchedFolders)
    .where(and(eq(watchedFolders.userEmail, userEmail), eq(watchedFolders.markId, markId)))
    .orderBy(asc(watchedFolders.folderPath))
    .all();

  return rows.map((row) => row.folderPath);
}

export function getAllWatchedFoldersForUser(userEmail: string): Record<string, string[]> {
  const rows = getDb()
    .select({ markId: watchedFolders.markId, folderPath: watchedFolders.folderPath })
    .from(watchedFolders)
    .where(eq(watchedFolders.userEmail, userEmail))
    .orderBy(asc(watchedFolders.markId), asc(watchedFolders.folderPath))
    .all();

  const result: Record<string, string[]> = {};
  for (const row of rows) {
    if (!result[row.markId]) {
      result[row.markId] = [];
    }
    result[row.markId].push(row.folderPath);
  }

  return result;
}

export function addWatchedFolderForUser(userEmail: string, markId: string, folderPath: string): void {
  const now = Date.now();
  getDb()
    .insert(watchedFolders)
    .values({ userEmail, markId, folderPath, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [watchedFolders.userEmail, watchedFolders.markId, watchedFolders.folderPath],
      set: { updatedAt: now },
    })
    .run();
}

export function removeWatchedFolderForUser(userEmail: string, markId: string, folderPath: string): void {
  getDb()
    .delete(watchedFolders)
    .where(
      and(
        eq(watchedFolders.userEmail, userEmail),
        eq(watchedFolders.markId, markId),
        eq(watchedFolders.folderPath, folderPath),
      ),
    )
    .run();
}

export function removeAllWatchedFoldersForMarkForUser(userEmail: string, markId: string): void {
  getDb()
    .delete(watchedFolders)
    .where(and(eq(watchedFolders.userEmail, userEmail), eq(watchedFolders.markId, markId)))
    .run();
}

export function setWatchedFoldersForMarkForUser(userEmail: string, markId: string, folderPaths: string[]): void {
  const now = Date.now();
  getDb()
    .delete(watchedFolders)
    .where(and(eq(watchedFolders.userEmail, userEmail), eq(watchedFolders.markId, markId)))
    .run();

  for (const folderPath of folderPaths) {
    getDb()
      .insert(watchedFolders)
      .values({ userEmail, markId, folderPath, createdAt: now, updatedAt: now })
      .run();
  }
}

export function findMarkIdForFolderForUser(userEmail: string, folderPath: string): string | null {
  const row = getDb()
    .select({ markId: watchedFolders.markId })
    .from(watchedFolders)
    .where(and(eq(watchedFolders.userEmail, userEmail), eq(watchedFolders.folderPath, folderPath)))
    .get();

  return row?.markId ?? null;
}

export function findMarkForFilePathForUser(userEmail: string, filePath: string): string | null {
  const rows = getDb()
    .select({ markId: watchedFolders.markId, folderPath: watchedFolders.folderPath })
    .from(watchedFolders)
    .where(eq(watchedFolders.userEmail, userEmail))
    .all();

  for (const row of rows) {
    if (filePath.startsWith(row.folderPath)) {
      return row.markId;
    }
  }

  return null;
}
