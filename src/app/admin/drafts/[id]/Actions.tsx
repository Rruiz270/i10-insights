"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveRejectButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy("approve");
    setError(null);
    const r = await fetch(`/api/admin/drafts/${id}/approve`, { method: "POST" });
    if (!r.ok) {
      setError(`approve failed (${r.status})`);
      setBusy(null);
      return;
    }
    router.push("/admin/drafts");
  }

  async function reject() {
    const reason = prompt("Motivo da rejeição (opcional):") ?? "";
    setBusy("reject");
    setError(null);
    const r = await fetch(`/api/admin/drafts/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!r.ok) {
      setError(`reject failed (${r.status})`);
      setBusy(null);
      return;
    }
    router.push("/admin/drafts");
  }

  return (
    <div className="mt-12 flex items-center gap-3 border-t border-gray-200 pt-8">
      <button
        type="button"
        onClick={approve}
        disabled={!!busy}
        className="rounded-md bg-green-dark px-5 py-2 text-sm font-semibold text-white hover:bg-green disabled:opacity-60"
      >
        {busy === "approve" ? "Aprovando..." : "Aprovar e publicar"}
      </button>
      <button
        type="button"
        onClick={reject}
        disabled={!!busy}
        className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
      >
        {busy === "reject" ? "Rejeitando..." : "Rejeitar"}
      </button>
      {error && (
        <span role="alert" className="text-sm text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
