import { closeSqlite, getSqlite, hardResetLegacyDbOnce, getDb } from "./client";
import { runMigrations } from "./migrate";
import { ensureUser, getCurrentUserFromSession, initCurrentUser, setCurrentUserInSession } from "./session";
import { config, fileHistory, files, users, watchedFolders } from "./schema";
import { deleteConfigValueForUser, getConfigValueForUser, setConfigValueForUser } from "./repos/configRepo";
import {
  FileRow,
  getFileByHashForUser,
  getFileByPathForUser,
  getSubmittedFileByHashForUser,
  markFileAsSubmittedForUser,
  updateFilePathById,
  upsertFileForUser,
} from "./repos/filesRepo";
import {
  getFileHistoryCountForFoldersForUser,
  getFileHistoryForFoldersForUser,
  getPreviousFileHashByFileId,
  insertFileHistoryForUser,
} from "./repos/fileHistoryRepo";
import {
  addWatchedFolderForUser,
  findMarkForFilePathForUser,
  findMarkIdForFolderForUser,
  getAllWatchedFoldersForUser,
  getWatchedFoldersForMarkForUser,
  removeAllWatchedFoldersForMarkForUser,
  removeWatchedFolderForUser,
  setWatchedFoldersForMarkForUser,
} from "./repos/watchedFoldersRepo";
import { clearTokenForUser, ensureUserRow, getTokenForUser, setTokenForUser } from "./repos/usersRepo";

export function initDb(): void {
  hardResetLegacyDbOnce();
  getDb();
  runMigrations();
  initCurrentUser();
  console.log("[db] Drizzle database initialized");
}

export function setCurrentUser(email: string | null): void {
  setCurrentUserInSession(email);
  if (email) {
    ensureUserRow(email);
  }
}

export function getCurrentUser(): string | null {
  return getCurrentUserFromSession();
}

export function dbExec(query: string, params?: unknown[]): void {
  const stmt = getSqlite().prepare(query);
  stmt.run(...(params ?? []));
}

export function dbQuery<T = unknown>(query: string, params?: unknown[]): T[] {
  const stmt = getSqlite().prepare(query);
  return stmt.all(...(params ?? [])) as T[];
}

export async function dbExecAsync(query: string, params?: unknown[]): Promise<void> {
  dbExec(query, params);
}

export async function dbQueryAsync<T = unknown>(query: string, params?: unknown[]): Promise<T[]> {
  return dbQuery<T>(query, params);
}

export async function getConfigValue(key: string): Promise<string | null> {
  return getConfigValueForUser(ensureUser(), key);
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  setConfigValueForUser(ensureUser(), key, value);
}

export async function deleteConfigValue(key: string): Promise<void> {
  deleteConfigValueForUser(ensureUser(), key);
}

export async function getFileByPath(filePath: string): Promise<FileRow | null> {
  return getFileByPathForUser(ensureUser(), filePath);
}

export async function getFileByHash(hash: string): Promise<FileRow | null> {
  return getFileByHashForUser(ensureUser(), hash);
}

export async function getSubmittedFileByHash(hash: string): Promise<FileRow | null> {
  return getSubmittedFileByHashForUser(ensureUser(), hash);
}

export async function upsertFile(filePath: string, hash: string, timestamp: number): Promise<{ id: number }> {
  return upsertFileForUser(ensureUser(), filePath, hash, timestamp);
}

export async function updateFilePath(fileId: number, newPath: string, timestamp: number): Promise<void> {
  updateFilePathById(fileId, newPath, timestamp);
}

export async function insertFileHistory(
  fileId: number | null,
  filePath: string,
  hash: string,
  eventType: string,
  timestamp: number,
): Promise<void> {
  insertFileHistoryForUser(ensureUser(), fileId, filePath, hash, eventType, timestamp);
}

export async function getFileHistoryForFolders(
  folders: string[],
  limit: number,
  offset: number,
): Promise<unknown[]> {
  return getFileHistoryForFoldersForUser(ensureUser(), folders, limit, offset);
}

export async function getFileHistoryCountForFolders(folders: string[]): Promise<number> {
  return getFileHistoryCountForFoldersForUser(ensureUser(), folders);
}

export async function getPreviousFileHash(fileId: number, currentHash: string): Promise<string | null> {
  return getPreviousFileHashByFileId(fileId, currentHash);
}

export async function markFileAsSubmitted(hash: string): Promise<void> {
  markFileAsSubmittedForUser(ensureUser(), hash);
}

export async function clearAllUserData(): Promise<void> {
  getDb().delete(fileHistory).run();
  getDb().delete(files).run();
  getDb().delete(config).run();
  getDb().delete(watchedFolders).run();
  getDb().delete(users).run();

  setCurrentUserInSession(null);
  console.log("[db] All user data cleared");
}

export async function getWatchedFoldersForMark(markId: string): Promise<string[]> {
  return getWatchedFoldersForMarkForUser(ensureUser(), markId);
}

export async function getAllWatchedFolders(): Promise<Record<string, string[]>> {
  return getAllWatchedFoldersForUser(ensureUser());
}

export async function addWatchedFolder(markId: string, folderPath: string): Promise<void> {
  addWatchedFolderForUser(ensureUser(), markId, folderPath);
}

export async function removeWatchedFolder(markId: string, folderPath: string): Promise<void> {
  removeWatchedFolderForUser(ensureUser(), markId, folderPath);
}

export async function removeAllWatchedFoldersForMark(markId: string): Promise<void> {
  removeAllWatchedFoldersForMarkForUser(ensureUser(), markId);
}

export async function setWatchedFoldersForMark(markId: string, folderPaths: string[]): Promise<void> {
  setWatchedFoldersForMarkForUser(ensureUser(), markId, folderPaths);
}

export async function findMarkIdForFolder(folderPath: string): Promise<string | null> {
  return findMarkIdForFolderForUser(ensureUser(), folderPath);
}

export async function findMarkForFilePath(filePath: string): Promise<string | null> {
  return findMarkForFilePathForUser(ensureUser(), filePath);
}

export async function getUserToken(): Promise<string | null> {
  return getTokenForUser(ensureUser());
}

export async function setUserToken(token: string): Promise<void> {
  const email = ensureUser();
  ensureUserRow(email);
  setTokenForUser(email, token);
}

export async function clearUserToken(): Promise<void> {
  clearTokenForUser(ensureUser());
}

export function closeDb(): void {
  closeSqlite();
}
