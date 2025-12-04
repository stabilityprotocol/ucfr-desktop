import {
  dbExec as remoteExec,
  dbQuery as remoteQuery,
  initRemoteDb,
} from "../shared/dbClient";

export async function initDb() {
  await initRemoteDb();
}

export async function dbExec(sql: string, params?: any[]): Promise<void> {
  await remoteExec(sql, params);
}

export async function dbQuery<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  return remoteQuery<T>(sql, params);
}

const db = {
  exec: (sql: string, params?: any[]) => dbExec(sql, params),
  query: <T = any>(sql: string, params?: any[]) => dbQuery<T>(sql, params),
};

export default db;
