// Idempotent migration runner.
// Reads migrations/*.sql in order, skips ones already applied (tracked in insights._migrations).
// Usage: node --env-file=.env.local scripts/migrate.mjs

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// WebSocket transport for the Pool driver (allows multi-statement SQL).
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function alreadyApplied(id) {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM insights._migrations WHERE id = $1 LIMIT 1",
      [id],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

const dir = new URL("../migrations/", import.meta.url).pathname;
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const id = file.replace(/\.sql$/, "");
  if (await alreadyApplied(id)) {
    console.log(`= skip ${id} (already applied)`);
    continue;
  }
  const body = await readFile(join(dir, file), "utf8");
  console.log(`+ applying ${id} (${body.length} bytes)`);
  await pool.query(body);
  console.log(`✓ applied ${id}`);
}

await pool.end();
console.log("done.");
