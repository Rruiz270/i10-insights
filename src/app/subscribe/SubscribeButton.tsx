"use client";

import { useState } from "react";

interface Props {
  email: string;
  token: string;
  source: string;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function SubscribeButton({ email, token, source }: Props) {
  const [state, setState] = useState<
    "idle" | "loading" | "success" | "already" | "error"
  >("idle");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(`${BASE_PATH}/api/newsletter/quick-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        return;
      }
      if (data.status === "already_confirmed") {
        setState("already");
      } else {
        setState("success");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg bg-green-pale px-6 py-4 text-center">
        <p className="text-lg font-bold text-navy">Inscrição confirmada!</p>
        <p className="mt-1 text-sm text-gray-600">
          Você já está na lista do i10 Insights. Até o próximo boletim!
        </p>
      </div>
    );
  }

  if (state === "already") {
    return (
      <div className="rounded-lg bg-cyan-pale px-6 py-4 text-center">
        <p className="text-lg font-bold text-navy">Você já está inscrito!</p>
        <p className="mt-1 text-sm text-gray-600">
          Este e-mail já consta na nossa lista. Nenhuma ação adicional
          necessária.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg bg-red-50 px-6 py-4 text-center">
        <p className="text-lg font-bold text-red-700">Erro ao confirmar</p>
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
      className="w-full cursor-pointer rounded-lg bg-green px-6 py-4 text-base font-bold text-navy-dark transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
    >
      {state === "loading" ? "Confirmando..." : "Confirmar inscrição"}
    </button>
  );
}
