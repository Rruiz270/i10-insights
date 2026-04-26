// Polls all 10 backfill Manus tasks until terminal, then validates and
// inserts each one with its assigned published_at + video_url.
//
// Usage: node --env-file=.env.local scripts/backfill-poll-insert.mjs

import { readFile } from "node:fs/promises";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const KEY = process.env.MANUS_API_KEY;
const DB = process.env.DATABASE_URL;
if (!KEY || !DB) throw new Error("env missing");

const BANNED = [
  "revolucionário", "revolucionária", "incrível", "disruptivo", "disruptiva",
  "game-changer", "solução mágica", "único no mundo", "perfeito", "garantido",
  "instantâneo", "viral", "revolutionary", "groundbreaking", "game-changing",
];

const items = JSON.parse(await readFile("/tmp/i10-backfill-tasks.json", "utf8"));
const live = items.filter((i) => i.task_id);

async function getTask(id) {
  const r = await fetch(`https://api.manus.ai/v1/tasks/${id}`, {
    headers: { API_KEY: KEY },
  });
  return r.json();
}

function extractJson(task) {
  const out = task.output;
  if (!Array.isArray(out)) throw new Error("output not array");
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i];
    if (m.role !== "assistant") continue;
    const blocks = m.content ?? [];
    for (let j = blocks.length - 1; j >= 0; j--) {
      const text = blocks[j].text ?? blocks[j].content ?? "";
      if (!text) continue;
      try { return JSON.parse(text); } catch {}
      const m2 = text.match(/\{[\s\S]*\}/);
      if (m2) { try { return JSON.parse(m2[0]); } catch {} }
    }
  }
  throw new Error("no JSON found");
}

function bannedHits(article) {
  const fields = ["title_pt", "title_en", "excerpt_pt", "excerpt_en", "body_pt", "body_en"];
  const v = [];
  for (const f of fields) {
    const text = String(article[f] ?? "").toLowerCase();
    for (const w of BANNED) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?![\\p{L}\\p{N}])`, "giu");
      const hits = text.match(re);
      if (hits) v.push(`${f}:${w}x${hits.length}`);
    }
  }
  return v;
}

async function insert(pool, article, item) {
  const result = await pool.query(
    `INSERT INTO insights.articles (
      id, category, published_at, title_pt, title_en, slug_pt, slug_en,
      excerpt_pt, excerpt_en, body_pt, body_en,
      hero_image_url, hero_image_alt_pt, hero_image_alt_en,
      video_url, citations
    ) VALUES (
      gen_random_uuid(), $1, $2::timestamptz, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15::jsonb
    )
    ON CONFLICT (slug_pt) DO NOTHING
    RETURNING id, slug_pt, published_at`,
    [
      article.category, `${item.target_date}T12:00:00Z`,
      article.title_pt, article.title_en,
      article.slug_pt, article.slug_en,
      article.excerpt_pt, article.excerpt_en,
      article.body_pt, article.body_en,
      article.hero_image_url ?? null,
      article.hero_image_alt_pt ?? null,
      article.hero_image_alt_en ?? null,
      article.video_url ?? null,
      JSON.stringify(article.citations ?? []),
    ],
  );
  return result.rows[0];
}

const state = new Map(live.map((i) => [i.task_id, { ...i, status: "running" }]));
const pool = new Pool({ connectionString: DB });

console.log(`polling ${live.length} tasks...`);
const start = Date.now();
const TIMEOUT_MS = 30 * 60_000; // 30 min hard cap

while (Date.now() - start < TIMEOUT_MS) {
  const pending = [...state.values()].filter((s) => s.status === "running");
  if (pending.length === 0) break;

  const checks = await Promise.all(pending.map((s) => getTask(s.task_id).catch((e) => ({ id: s.task_id, status: "failed", error: e.message }))));
  for (const t of checks) {
    const cur = state.get(t.id);
    if (!cur) continue;
    if (t.status === "completed") {
      try {
        const article = extractJson(t);
        const banned = bannedHits(article);
        const inserted = await insert(pool, article, cur);
        if (inserted) {
          console.log(`✓ ${cur.target_date} (${cur.target_category}${cur.with_video ? "+v" : ""}) → ${inserted.slug_pt}${banned.length ? `  ⚠ banned: ${banned.join(",")}` : ""}`);
        } else {
          console.log(`= ${cur.target_date} skipped (slug conflict)`);
        }
        state.set(t.id, { ...cur, status: "inserted" });
      } catch (e) {
        console.error(`✗ ${cur.target_date} insert failed: ${e.message}`);
        state.set(t.id, { ...cur, status: "insert-failed", error: e.message });
      }
    } else if (t.status === "failed" || t.status === "cancelled") {
      console.error(`✗ ${cur.target_date} task ${t.status}`);
      state.set(t.id, { ...cur, status: t.status });
    }
  }

  const remaining = [...state.values()].filter((s) => s.status === "running").length;
  if (remaining > 0) {
    process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${remaining} still running\n`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

await pool.end();
const final = [...state.values()];
const ok = final.filter((s) => s.status === "inserted").length;
const fail = final.filter((s) => s.status !== "inserted").length;
console.log(`\nDONE: ${ok} inserted, ${fail} not inserted`);
for (const s of final.filter((s) => s.status !== "inserted")) {
  console.log(`  ${s.target_date}: ${s.status}${s.error ? ` (${s.error})` : ""}`);
}
