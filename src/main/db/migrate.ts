import fs from "fs";
import path from "path";
import { app } from "electron";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "./client";

function resolveMigrationsFolder(): string {
  const candidates = [
    // Dev mode: project root
    path.resolve(process.cwd(), "drizzle"),
    // Packaged: extraResources are placed in process.resourcesPath
    path.join(app.isPackaged ? process.resourcesPath : "", "drizzle"),
    // Fallback: relative to compiled JS
    path.resolve(__dirname, "../../../drizzle"),
  ].filter(Boolean);

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
