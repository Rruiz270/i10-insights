"use client";

import { useState } from "react";

interface Props {
  email: string;
  token: string;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function UnsubscribeButton({ email, token }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(`${BASE_PATH}/api/newsletter/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg bg-gray-100 px-6 py-4 text-center">
        <p className="text-lg font-bold text-navy">Inscricao cancelada</p>
        <p className="mt-1 text-sm text-gray-600">
          Voce foi removido da lista do i10 Insights. Sentiremos sua falta!
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg bg-red-50 px-6 py-4 text-center">
        <p className="text-lg font-bold text-red-700">Erro ao cancelar</p>
        <p className="mt-1 text-sm text-red-600">
          Houve um problema. Tente novamente ou entre em contato conosco.
        </p>
        <button
          onClick={handleClick}
          className="mt-3 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-light"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="w-full cursor-pointer rounded-lg border-2 border-red-300 bg-white px-6 py-4 text-base font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
    >
      {state === "loading" ? "Cancelando..." : "Cancelar inscricao"}
    </button>
  );
}
