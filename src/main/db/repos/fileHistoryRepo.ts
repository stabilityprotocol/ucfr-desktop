import { and, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { getDb } from "../client";
import { fileHistory } from "../schema";

export function insertFileHistoryForUser(
  userEmail: string,
  fileId: number | null,
  filePath: string,
  hash: string,
  eventType: string,
  timestamp: number,
): void {
  getDb()
    .insert(fileHistory)
    .values({
      userEmail,
      fileId,
      path: filePath,
      hash,
      eventType,
      timestamp,
    })
    .onConflictDoNothing({
      target: [fileHistory.userEmail, fileHistory.fileId, fileHistory.hash],
    })
    .run();
}

export function getFileHistoryForFoldersForUser(
  userEmail: string,
  folders: string[],
  limit: number,
  offset: number,
): unknown[] {
  if (folders.length === 0) {
    return [];
  }

  const predicates = folders.map((folder) => like(fileHistory.path, `${folder}%`));
  return getDb()
    .select()
    .from(fileHistory)
    .where(and(eq(fileHistory.userEmail, userEmail), or(...predicates)!))
    .orderBy(desc(fileHistory.timestamp))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getFileHistoryCountForFoldersForUser(userEmail: string, folders: string[]): number {
  if (folders.length === 0) {
    return 0;
  }

  const predicates = folders.map((folder) => like(fileHistory.path, `${folder}%`));
  const row = getDb()
    .select({ count: sql<number>`count(*)` })
    .from(fileHistory)
    .where(and(eq(fileHistory.userEmail, userEmail), or(...predicates)!))
    .get();

  return row?.count ?? 0;
}

export function getPreviousFileHashByFileId(fileId: number, currentHash: string): string | null {
  const row = getDb()
    .select({ hash: fileHistory.hash })
    .from(fileHistory)
    .where(and(eq(fileHistory.fileId, fileId), ne(fileHistory.hash, currentHash)))
    .orderBy(desc(fileHistory.timestamp), desc(fileHistory.id))
    .limit(1)
    .get();

  return row?.hash ?? null;
}
