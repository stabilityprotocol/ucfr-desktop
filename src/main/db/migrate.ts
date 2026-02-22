import fs from "fs";
import path from "path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "./client";

function resolveMigrationsFolder(): string {
  const candidates = [
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(__dirname, "../../../drizzle"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`[db] Could not find migrations folder. Checked: ${candidates.join(", ")}`);
}

export function runMigrations(): void {
  const migrationsFolder = resolveMigrationsFolder();
  migrate(getDb(), { migrationsFolder });
  console.log("[db] Migrations applied");
}
