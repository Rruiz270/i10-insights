// Fire 10 Manus tasks in parallel for retroactive articles.
// Saves task IDs + metadata to /tmp/i10-backfill-tasks.json so the poll script
// can find them. We override published_at on insertion so each article carries
// its assigned date.
//
// Usage: node --env-file=.env.local scripts/backfill-fire.mjs

import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";

const KEY = process.env.MANUS_API_KEY;
if (!KEY) throw new Error("MANUS_API_KEY missing");

const baseBrief = await readFile(
  new URL("./manus-brief.txt", import.meta.url),
  "utf8",
);

// Weekday → category map (must match insights.category enum)
const WEEKDAY_THEME = {
  1: { theme: "Política & Equidade", category: "politica" },
  2: { theme: "Sala de Aula", category: "sala_de_aula" },
  3: { theme: "Pesquisa", category: "pesquisa" },
  4: { theme: "Ferramentas & LLMs", category: "ferramentas" },
  5: { theme: "Ética & Futuro", category: "etica" },
};

// 10 retroactive dates — weekdays from Apr 14 to Apr 25, 2026
// (yyyy-mm-dd format; weekday 1=Mon..5=Fri)
const SCHEDULE = [
  { date: "2026-04-25", weekday: 5, withVideo: false },
  { date: "2026-04-24", weekday: 4, withVideo: true },  // ferramentas — video
  { date: "2026-04-23", weekday: 3, withVideo: false },
  { date: "2026-04-22", weekday: 2, withVideo: false },
  { date: "2026-04-21", weekday: 1, withVideo: false },
  { date: "2026-04-18", weekday: 5, withVideo: false },
  { date: "2026-04-17", weekday: 4, withVideo: true },  // ferramentas — video
  { date: "2026-04-16", weekday: 3, withVideo: false },
  { date: "2026-04-15", weekday: 2, withVideo: false },
  { date: "2026-04-14", weekday: 1, withVideo: false },
];

function buildBrief({ date, weekday, withVideo }) {
  const { theme, category } = WEEKDAY_THEME[weekday];
  const dayName = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"][
    new Date(date + "T12:00:00Z").getUTCDay()
  ];
  const videoBlock = withVideo
    ? `\n\n# THIS ARTICLE INCLUDES A VIDEO\n\nGenerate a short editorial-quality video (15-60 seconds, 16:9, no audio narration required — visual storytelling). Subject: a conceptual visualization tied to the article. Same NYT/Atlantic aesthetic as the hero image. Return the public HTTPS URL of the video in the JSON field "video_url". The "hero_image_url" should also be present (use a frame from the video or a separate still).`
    : `\n\nDo NOT include a video. Set "video_url" to null in the JSON.`;
  return baseBrief
    .replace(
      /^# YOUR JOB TODAY/m,
      `# CONTEXT — RETROACTIVE PUBLICATION\n\nYou are writing an article DATED ${date} (${dayName}-feira). Today's editorial date is ${date}. Search for stories published on or BEFORE that date — do NOT cite anything published after ${date}. The weekday theme is "${theme}" → category="${category}". This is part of a backfill batch establishing the publication's archive.\n\n# YOUR JOB`
    ) + videoBlock;
}

async function createTask(prompt, metadata) {
  const r = await fetch("https://api.manus.ai/v1/tasks", {
    method: "POST",
    headers: { API_KEY: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, mode: "agent", metadata }),
  });
  if (!r.ok) throw new Error(`createTask: ${r.status} ${await r.text()}`);
  return r.json();
}

const results = [];
let i = 0;
for (const item of SCHEDULE) {
  i++;
  const prompt = buildBrief(item);
  const meta = {
    source: "i10-insights-backfill",
    target_date: item.date,
    target_category: WEEKDAY_THEME[item.weekday].category,
    with_video: item.withVideo,
  };
  try {
    const task = await createTask(prompt, meta);
    const id = task.task_id ?? task.id;
    console.log(`[${i}/10] ${item.date} (${meta.target_category}${item.withVideo ? "+video" : ""}) → ${id}`);
    results.push({ ...item, ...meta, task_id: id });
  } catch (e) {
    console.error(`[${i}/10] FAIL: ${e.message}`);
    results.push({ ...item, error: e.message });
  }
  // Small gap to avoid any rate-limit twitch
  await new Promise((r) => setTimeout(r, 1000));
}

await writeFile("/tmp/i10-backfill-tasks.json", JSON.stringify(results, null, 2));
console.log(`\n✓ kicked off ${results.filter((r) => r.task_id).length}/10 tasks`);
console.log("metadata saved to /tmp/i10-backfill-tasks.json");
