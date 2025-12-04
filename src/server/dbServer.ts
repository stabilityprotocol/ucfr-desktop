import express, { type Request, type Response } from "express";
import cors from "cors";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";
import os from "os";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

const dbDir = path.join(os.homedir(), ".ucfr-pglite");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`[db-server] PGlite Database path: ${dbDir}`);

const db = new PGlite(dbDir);

async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      current_hash TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      UNIQUE(path)
    );

    CREATE TABLE IF NOT EXISTS file_history (
      id SERIAL PRIMARY KEY,
      file_id INTEGER,
      path TEXT NOT NULL,
      hash TEXT,
      event_type TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `);
}

app.post("/sql/exec", async (req: Request, res: Response) => {
  try {
    const { sql, params } = req.body as { sql: string; params?: any[] };
    if (params && params.length > 0) {
      await db.query(sql, params);
    } else {
      await db.exec(sql);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("[db-server] exec error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/sql/query", async (req: Request, res: Response) => {
  try {
    const { sql, params } = req.body as { sql: string; params?: any[] };
    const result = await db.query(sql, params ?? []);
    res.json({ ok: true, rows: result.rows });
  } catch (e) {
    console.error("[db-server] query error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/init", async (_req: Request, res: Response) => {
  try {
    await initDb();
    res.json({ ok: true });
  } catch (e) {
    console.error("[db-server] init error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

(async () => {
  await initDb();
  const port = process.env.UCFR_DB_PORT
    ? Number(process.env.UCFR_DB_PORT)
    : 4545;
  app.listen(port, () => {
    console.log(`[db-server] listening on http://localhost:${port}`);
  });
})();


