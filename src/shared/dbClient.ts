const DEFAULT_BASE_URL = "http://localhost:4545";

function getBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.UCFR_DB_URL) {
    return process.env.UCFR_DB_URL;
  }
  if (typeof window !== "undefined" && (window as any).__UCFR_DB_URL__) {
    return (window as any).__UCFR_DB_URL__ as string;
  }
  return DEFAULT_BASE_URL;
}

export async function dbExec(sql: string, params?: any[]): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/sql/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    throw new Error(`dbExec failed: ${res.status} ${res.statusText}`);
  }
}

export async function dbQuery<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const res = await fetch(`${getBaseUrl()}/sql/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    throw new Error(`dbQuery failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { ok: boolean; rows: T[] };
  if (!data.ok) {
    throw new Error("dbQuery returned not ok");
  }
  return data.rows;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initRemoteDb(
  retries = 20,
  intervalMs = 500
): Promise<void> {
  const url = `${getBaseUrl()}/init`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.ok) {
        return;
      }
    } catch {
      // ignore and retry
    }
    await delay(intervalMs);
  }
  throw new Error(
    `initRemoteDb failed: could not reach ${url} after ${retries} attempts`
  );
}
