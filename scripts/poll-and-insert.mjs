// Polls a Manus task until it terminates, then validates the output and
// inserts an article straight into insights.articles.
//
// Usage:
//   node --env-file=.env.local scripts/poll-and-insert.mjs <task_id>
//
// For the launch piece we bypass the drafts table — you'll review here in chat,
// not through the (not-yet-built) admin dashboard. Subsequent articles go
// through insights.drafts via the webhook receiver.

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const TASK_ID = process.argv[2];
if (!TASK_ID) {
  console.error("usage: node scripts/poll-and-insert.mjs <task_id>");
  process.exit(2);
}

const KEY = process.env.MANUS_API_KEY;
const DB = process.env.DATABASE_URL;
if (!KEY || !DB) {
  console.error("MANUS_API_KEY or DATABASE_URL missing");
  process.exit(2);
}

const BANNED = [
  "revolucionário", "revolucionária", "incrível", "disruptivo", "disruptiva",
  "game-changer", "solução mágica", "único no mundo", "perfeito", "garantido",
  "instantâneo", "viral", "revolutionary", "groundbreaking", "game-changing",
];

async function getTask() {
  const r = await fetch(`https://api.manus.ai/v1/tasks/${TASK_ID}`, {
    headers: { API_KEY: KEY },
  });
  if (!r.ok) throw new Error(`status ${r.status} ${r.statusText}`);
  return r.json();
}

async function poll() {
  for (let i = 0; i < 60; i++) { // ~20 min max
    const t = await getTask();
    process.stdout.write(`[${new Date().toISOString()}] status=${t.status}\n`);
    if (t.status === "completed" || t.status === "failed" || t.status === "cancelled") {
      return t;
    }
    await new Promise((r) => setTimeout(r, 20_000));
  }
  throw new Error("timed out after 20 min");
}

function extractJson(task) {
  // Manus output is an array of message blocks. We want the final assistant
  // message that contains our JSON payload.
  const out = task.output;
  if (!Array.isArray(out)) throw new Error("output not array");
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i];
    if (m.role !== "assistant") continue;
    const blocks = m.content ?? [];
    for (let j = blocks.length - 1; j >= 0; j--) {
      const b = blocks[j];
      const text = b.text ?? b.content ?? "";
      if (!text) continue;
      // Try plain parse first
      try { return JSON.parse(text); } catch {}
      // Try to extract first JSON object via regex
      const m2 = text.match(/\{[\s\S]*\}/);
      if (m2) {
        try { return JSON.parse(m2[0]); } catch {}
      }
    }
  }
  throw new Error("no JSON found in output");
}

function validate(article) {
  const required = [
    "category", "title_pt", "title_en", "slug_pt", "slug_en",
    "excerpt_pt", "excerpt_en", "body_pt", "body_en",
  ];
  const missing = required.filter((k) => !article[k]);
  if (missing.length) throw new Error(`missing fields: ${missing.join(",")}`);
  const cats = ["politica", "sala_de_aula", "pesquisa", "ferramentas", "etica"];
  if (!cats.includes(article.category)) {
    throw new Error(`invalid category: ${article.category}`);
  }
  // Banned-words scan
  const fields = ["title_pt", "title_en", "excerpt_pt", "excerpt_en", "body_pt", "body_en"];
  const violations = [];
  for (const f of fields) {
    const text = String(article[f]).toLowerCase();
    for (const w of BANNED) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\p{L}\\p{N}])`, "giu");
      const hits = text.match(re);
      if (hits) violations.push({ field: f, word: w, count: hits.length });
    }
  }
  return { violations };
}

async function insert(article) {
  const pool = new Pool({ connectionString: DB });
  const result = await pool.query(
    `INSERT INTO insights.articles (
      id, category, title_pt, title_en, slug_pt, slug_en,
      excerpt_pt, excerpt_en, body_pt, body_en,
      hero_image_url, hero_image_alt_pt, hero_image_alt_en,
      citations
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12,
      $13::jsonb
    )
    RETURNING id, slug_pt, slug_en, published_at`,
    [
      article.category,
      article.title_pt, article.title_en,
      article.slug_pt, article.slug_en,
      article.excerpt_pt, article.excerpt_en,
      article.body_pt, article.body_en,
      article.hero_image_url ?? null,
      article.hero_image_alt_pt ?? null,
      article.hero_image_alt_en ?? null,
      JSON.stringify(article.citations ?? []),
    ],
  );
  await pool.end();
  return result.rows[0];
}

(async () => {
  console.log(`polling task ${TASK_ID}...`);
  const task = await poll();
  console.log(`final status: ${task.status}`);
  if (task.status !== "completed") {
    console.error("task did not complete; aborting");
    console.error(JSON.stringify(task, null, 2).slice(0, 2000));
    process.exit(1);
  }
  console.log("extracting JSON...");
  const article = extractJson(task);
  console.log(`got article: "${article.title_pt}" (category=${article.category})`);
  const v = validate(article);
  if (v.violations.length > 0) {
    console.warn("⚠ banned-words violations:");
    for (const x of v.violations) console.warn(`  ${x.field}: "${x.word}" x${x.count}`);
    console.warn("(inserting anyway for launch piece — review in chat)");
  }
  console.log("inserting...");
  const inserted = await insert(article);
  console.log("✓ inserted:", inserted);
  console.log(`http://localhost:3000/pt/articles/${inserted.slug_pt}`);
  console.log(`http://localhost:3000/en/articles/${inserted.slug_en}`);
})().catch((err) => { console.error("FAIL:", err.message); process.exit(1); });
