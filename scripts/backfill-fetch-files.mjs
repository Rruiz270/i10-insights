// Re-process the backfill task IDs, this time handling Manus output_file blocks
// (which deliver the JSON and the hero image/video as presigned session files).
// Downloads the presigned file in time, parses JSON, inserts with override date.
//
// Usage: node --env-file=.env.local scripts/backfill-fetch-files.mjs

import { readFile } from "node:fs/promises";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const KEY = process.env.MANUS_API_KEY;
const DB = process.env.DATABASE_URL;

const items = JSON.parse(await readFile("/tmp/i10-backfill-tasks.json", "utf8"));
const live = items.filter((i) => i.task_id);

async function getTask(id) {
  const r = await fetch(`https://api.manus.ai/v1/tasks/${id}`, {
    headers: { API_KEY: KEY },
  });
  return r.json();
}

async function downloadJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  return r.json();
}

// Extract JSON from a completed task. Handles two shapes:
//   (a) inline text containing the JSON object
//   (b) output_file with .json extension (presigned URL — must fetch in time)
async function extractArticleJson(task) {
  const out = task.output;
  if (!Array.isArray(out)) return null;

  // Search assistant messages from latest to earliest
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i];
    if (m?.role !== "assistant") continue;
    const blocks = m.content ?? [];

    // 1. Try output_file with JSON ext
    for (const b of blocks) {
      if (b.type === "output_file" && /\.json($|\?)/i.test(b.fileUrl ?? "")) {
        try { return await downloadJson(b.fileUrl); } catch (e) {
          console.warn(`  download failed: ${e.message}`);
        }
      }
    }

    // 2. Try inline output_text
    for (const b of blocks) {
      const text = b.text ?? b.content ?? "";
      if (typeof text !== "string" || !text) continue;
      try { return JSON.parse(text); } catch {}
      const m2 = text.match(/\{[\s\S]*\}/);
      if (m2) { try { return JSON.parse(m2[0]); } catch {} }
    }
  }
  return null;
}

// If hero_image_url points to a presigned manuscdn session file, swap it for
// the LATEST output_file image URL from the task (also presigned but at least
// fetched right now). Note: BOTH will eventually expire — we'll need to
// re-host to Vercel Blob in a follow-up. For now we accept the short-term
// expiration risk to get content live.
function findImageInTaskOutput(task) {
  const out = task.output;
  if (!Array.isArray(out)) return null;
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i];
    if (m?.role !== "assistant") continue;
    const blocks = m.content ?? [];
    for (const b of blocks) {
      if (b.type === "output_file" && /\.(png|jpe?g|webp)($|\?)/i.test(b.fileUrl ?? "")) {
        return b.fileUrl;
      }
    }
  }
  return null;
}

function findVideoInTaskOutput(task) {
  const out = task.output;
  if (!Array.isArray(out)) return null;
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i];
    if (m?.role !== "assistant") continue;
    const blocks = m.content ?? [];
    for (const b of blocks) {
      if (b.type === "output_file" && /\.(mp4|mov|webm)($|\?)/i.test(b.fileUrl ?? "")) {
        return b.fileUrl;
      }
    }
  }
  return null;
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
    RETURNING id, slug_pt, video_url IS NOT NULL AS has_video`,
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

const pool = new Pool({ connectionString: DB });
let ok = 0, fail = 0, skipped = 0;
for (const item of live) {
  const task = await getTask(item.task_id);
  if (task.status !== "completed") {
    console.log(`= ${item.target_date} status=${task.status} (skip)`);
    skipped++;
    continue;
  }
  let article = null;
  try {
    article = await extractArticleJson(task);
  } catch (e) {
    console.error(`✗ ${item.target_date} extract: ${e.message}`);
    fail++;
    continue;
  }
  if (!article) {
    console.error(`✗ ${item.target_date} no JSON found in output`);
    fail++;
    continue;
  }
  // Backfill hero_image / video if missing in JSON but present as output_file
  if (!article.hero_image_url) article.hero_image_url = findImageInTaskOutput(task);
  if (!article.video_url) article.video_url = findVideoInTaskOutput(task);

  // Validate required
  const required = ["category", "title_pt", "title_en", "slug_pt", "slug_en", "excerpt_pt", "excerpt_en", "body_pt", "body_en"];
  const missing = required.filter((k) => !article[k]);
  if (missing.length) {
    console.error(`✗ ${item.target_date} missing: ${missing.join(",")}`);
    fail++;
    continue;
  }
  try {
    const inserted = await insert(pool, article, item);
    if (inserted) {
      console.log(`✓ ${item.target_date} (${article.category}${inserted.has_video ? "+video" : ""}) → ${inserted.slug_pt}`);
      ok++;
    } else {
      console.log(`= ${item.target_date} skipped (slug conflict)`);
      skipped++;
    }
  } catch (e) {
    console.error(`✗ ${item.target_date} insert: ${e.message}`);
    fail++;
  }
}
await pool.end();
console.log(`\nDONE: ${ok} inserted, ${skipped} skipped, ${fail} failed`);
