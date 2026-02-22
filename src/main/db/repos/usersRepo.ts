import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { users } from "../schema";

export function ensureUserRow(email: string): void {
  const now = Date.now();
  getDb()
    .insert(users)
    .values({ email, createdAt: now, updatedAt: now })
    .onConflictDoNothing()
    .run();
}

export function getTokenForUser(email: string): string | null {
  const row = getDb().select({ token: users.token }).from(users).where(eq(users.email, email)).get();
  return row?.token ?? null;
}

export function setTokenForUser(email: string, token: string): void {
  getDb()
    .update(users)
    .set({ token, updatedAt: Date.now() })
    .where(eq(users.email, email))
    .run();
}

export function clearTokenForUser(email: string): void {
  getDb()
    .update(users)
    .set({ token: null, updatedAt: Date.now() })
    .where(eq(users.email, email))
    .run();
}
