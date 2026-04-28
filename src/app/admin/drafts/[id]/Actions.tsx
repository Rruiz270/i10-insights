"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function ApproveRejectButtons({
  id,
  category,
}: {
  id: string;
  category: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | "revise" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [showRevise, setShowRevise] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [revised, setRevised] = useState(false);

  async function approve() {
    setBusy("approve");
    setError(null);
    const r = await fetch(`${BASE}/api/admin/drafts/${id}/approve`, {
      method: "POST",
    });
    if (!r.ok) {
      setError(`Erro ao aprovar (${r.status})`);
      setBusy(null);
      return;
    }
    router.push("/admin/drafts");
  }

  async function reject() {
    setBusy("reject");
    setError(null);
    const r = await fetch(`${BASE}/api/admin/drafts/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: feedback, regenerate: false }),
    });
    if (!r.ok) {
      setError(`Erro ao rejeitar (${r.status})`);
      setBusy(null);
      return;
    }
    router.push("/admin/drafts");
  }

  async function reviseAndRegenerate() {
    if (!feedback.trim()) {
      setError("Escreva o feedback antes de pedir revisão ao Manus.");
      return;
    }
    setBusy("revise");
    setError(null);
    const r = await fetch(`${BASE}/api/admin/drafts/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: feedback,
        regenerate: true,
        category,
      }),
    });
    if (!r.ok) {
      setError(`Erro ao enviar para revisão (${r.status})`);
      setBusy(null);
      return;
    }
    const data = await r.json();
    setRevised(true);
    setBusy(null);
    setError(null);
    if (data.new_task_id) {
      // keep showing success message
    }
  }

  if (revised) {
    return (
      <div className="mt-12 rounded-lg border border-cyan bg-cyan-pale/30 p-6">
        <p className="text-lg font-bold text-navy">
          Revisão enviada ao Manus
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Um novo draft será gerado com as correções solicitadas. Quando
          pronto, ele aparecerá na fila de aprovação.
        </p>
        <button
          onClick={() => router.push("/admin")}
          className="mt-4 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-light"
        >
          Voltar ao dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={approve}
          disabled={!!busy}
          className="rounded-md bg-green-dark px-5 py-2 text-sm font-semibold text-white hover:bg-green disabled:opacity-60"
        >
          {busy === "approve"
            ? "Aprovando e enviando emails..."
            : "Aprovar e publicar"}
        </button>
        <button
          type="button"
          onClick={() => setShowRevise(!showRevise)}
          disabled={!!busy}
          className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-orange-600 ring-1 ring-orange-200 hover:bg-orange-50 disabled:opacity-60"
        >
          Pedir revisão ao Manus
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={!!busy}
          className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
        >
          {busy === "reject" ? "Rejeitando..." : "Rejeitar"}
        </button>
      </div>

      {showRevise && (
        <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50/50 p-5">
          <label className="block text-sm font-semibold text-navy">
            Feedback para o Manus
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Descreva o que precisa mudar — ex: &quot;trocar a imagem por algo
            mais editorial&quot;, &quot;o título está longo demais&quot;,
            &quot;focar mais em dados brasileiros&quot;.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="Ex: Não gostei da imagem. Gerar uma ilustração editorial no estilo NYT com tons navy e cyan, sem fotos de estoque."
            className="mt-3 w-full rounded-md border border-orange-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
          />
          <button
            type="button"
            onClick={reviseAndRegenerate}
            disabled={!!busy || !feedback.trim()}
            className="mt-4 rounded-md bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {busy === "revise"
              ? "Enviando ao Manus..."
              : "Rejeitar e regenerar com este feedback"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
