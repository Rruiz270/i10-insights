// Generate a short editorial video for an existing article via a dedicated
// Manus task. Uses the article body as context. The video task is separate
// from article generation (which had video tasks stuck in 'pending' for 45+
// min — bundling video with article seems to hit a slower pipeline).
//
// Usage: node --env-file=.env.local scripts/manus-video.mjs <slug_pt>

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: node scripts/manus-video.mjs <slug_pt>");
  process.exit(2);
}

const KEY = process.env.MANUS_API_KEY;
const DB = process.env.DATABASE_URL;
if (!KEY || !DB) throw new Error("env missing");

const pool = new Pool({ connectionString: DB });
const articles = await pool.query(
  "SELECT id, title_pt, excerpt_pt, body_pt, category FROM insights.articles WHERE slug_pt = $1 LIMIT 1",
  [SLUG],
);
if (articles.rows.length === 0) {
  console.error(`no article with slug_pt=${SLUG}`);
  await pool.end();
  process.exit(1);
}
const a = articles.rows[0];
console.log(`generating video for: "${a.title_pt}" (category=${a.category})`);

const prompt = `Você é um especialista em produção de vídeos editoriais curtos para o Instituto i10 (institutoi10.com.br) — uma ONG brasileira aplicando inteligência artificial à educação pública.

# TAREFA

Crie um vídeo curto (30-45 segundos, 16:9, sem narração — storytelling visual) que acompanhe o artigo abaixo na publicação i10 Insights.

# ARTIGO

Título: ${a.title_pt}
Categoria: ${a.category}

Resumo:
${a.excerpt_pt}

Corpo:
${a.body_pt}

# DIREÇÃO ARTÍSTICA — não-negociável

ESTILO: editorial premium. Pense NYT Op-Docs, Atlantic Magazine vídeos, MIT Technology Review explainers. NÃO é cartoon, NÃO é stock, NÃO é genérico-AI.

PALETA: navy #0A2463 / cyan #00B4D8 / green #00E5A0 / off-white #F8FAFC. Use exclusivamente essas cores e gradientes entre elas.

ESCOLHA UM dos dois caminhos visuais:

A) Documentário visual — sequência de 3-5 cenas curtas com:
- Estudantes brasileiros diversos em escola pública (sem rostos identificáveis)
- Mãos em laptops/tablets, close-up
- Lousas, cadernos, livros didáticos brasileiros
- Salas de aula reais (não polidas demais)
- Cenas curtas (5-10s cada) em sequência rítmica

B) Animação editorial — ilustração geométrica animada:
- Nodes de rede conectando-se
- Gráficos crescendo / dados fluindo
- Hexágonos, círculos, linhas em navy/cyan/green
- Movimento suave, NÃO frenético

ÁUDIO: música de fundo instrumental sutil OU silêncio. Sem narração de voz. Sem voiceover. Sem efeitos sonoros chamativos.

TEXTO ON-SCREEN: máximo 2-3 frases curtas em momentos-chave (não em cada cena). Use a fonte Inter (sans-serif). Branco sobre fundo navy.

# DURAÇÃO

30-45 segundos. Nem mais, nem menos. Cortar para o essencial.

# ENTREGÁVEL

Devolva o vídeo final como output_file (.mp4, H.264, 1920×1080). Compartilhe a URL pública (não-presigned se possível, mas presigned aceita).

NÃO me devolva mensagens explicando o vídeo — só anexe o arquivo final.
`;

console.log("creating Manus task...");
const r = await fetch("https://api.manus.ai/v1/tasks", {
  method: "POST",
  headers: { API_KEY: KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt,
    mode: "agent",
    metadata: {
      source: "i10-insights-video-attach",
      article_slug_pt: SLUG,
      article_id: a.id,
    },
  }),
});
if (!r.ok) {
  console.error("createTask failed:", r.status, await r.text());
  await pool.end();
  process.exit(1);
}
const task = await r.json();
const taskId = task.task_id ?? task.id;
console.log(`task_id: ${taskId}`);
console.log(`live: https://manus.im/app/${taskId}`);

console.log("polling (videos can take 10-20 min)...");
const TIMEOUT_MS = 30 * 60_000;
const start = Date.now();
while (Date.now() - start < TIMEOUT_MS) {
  const tr = await fetch(`https://api.manus.ai/v1/tasks/${taskId}`, {
    headers: { API_KEY: KEY },
  });
  const t = await tr.json();
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] status=${t.status}\n`);
  if (t.status === "completed") {
    // Find the video output_file
    let videoUrl = null;
    for (let i = (t.output ?? []).length - 1; i >= 0; i--) {
      const m = t.output[i];
      if (m.role !== "assistant") continue;
      for (const b of m.content ?? []) {
        if (b.type === "output_file" && /\.(mp4|mov|webm)($|\?)/i.test(b.fileUrl ?? "")) {
          videoUrl = b.fileUrl;
          break;
        }
      }
      if (videoUrl) break;
    }
    if (!videoUrl) {
      console.error("task completed but no video file in output");
      await pool.end();
      process.exit(1);
    }
    console.log(`video URL: ${videoUrl.slice(0, 80)}...`);
    await pool.query(
      "UPDATE insights.articles SET video_url = $1, updated_at = now() WHERE id = $2",
      [videoUrl, a.id],
    );
    console.log(`✓ updated insights.articles.video_url for ${a.id}`);
    console.log(`view: https://www.institutoi10.com.br/insights/pt/articles/${SLUG}`);
    console.log(`reminder: trigger /api/admin/revalidate to flush cache`);
    await pool.end();
    process.exit(0);
  }
  if (t.status === "failed" || t.status === "cancelled") {
    console.error(`task ${t.status}`);
    await pool.end();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 30_000));
}
console.error("timed out after 30min");
await pool.end();
process.exit(1);
