import { and, eq } from "drizzle-orm";
import { getDb } from "../client";
import { config } from "../schema";

export function getConfigValueForUser(userEmail: string, key: string): string | null {
  const row = getDb()
    .select({ value: config.value })
    .from(config)
    .where(and(eq(config.userEmail, userEmail), eq(config.key, key)))
    .get();

  return row?.value ?? null;
}

export function setConfigValueForUser(userEmail: string, key: string, value: string): void {
  const now = Date.now();
  getDb()
    .insert(config)
    .values({ userEmail, key, value, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [config.userEmail, config.key],
      set: { value, updatedAt: now },
    })
    .run();
}

export function deleteConfigValueForUser(userEmail: string, key: string): void {
  getDb().delete(config).where(and(eq(config.userEmail, userEmail), eq(config.key, key))).run();
}
