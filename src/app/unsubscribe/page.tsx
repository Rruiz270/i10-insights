import { verifyUnsubscribeToken } from "@/lib/tokens";
import UnsubscribeButton from "./UnsubscribeButton";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ email?: string; token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email ?? "";
  const token = params.token ?? "";

  const valid = email && token && (await verifyUnsubscribeToken(email, token));

  return (
    <main className="flex min-h-screen items-center justify-center bg-off-white px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="rounded-t-2xl bg-navy px-8 py-8 text-center">
          <h1 className="text-3xl font-extrabold text-green">i10</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-white/50">
            Insights
          </p>
        </div>

        {/* Body */}
        <div className="border-x border-gray-200 bg-white px-8 py-10">
          {!valid ? (
            <>
              <h2 className="font-serif text-2xl text-navy">
                Link inválido
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Este link de cancelamento é inválido ou expirou. Se você
                acredita que isso é um erro, entre em contato conosco.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-navy">
                Cancelar inscrição
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Você está cancelando a inscrição do e-mail:
              </p>
              <p className="mt-2 rounded-lg bg-gray-50 px-4 py-3 text-center font-mono text-sm font-semibold text-navy">
                {email}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                Após confirmar, você não receberá mais o boletim i10 Insights.
                Você pode se reinscrever a qualquer momento.
              </p>

              <div className="mt-8">
                <UnsubscribeButton email={email} token={token} />
              </div>

              <div className="mt-6 text-center">
                <a
                  href="https://www.institutoi10.com.br/insights"
                  className="text-sm font-semibold text-cyan hover:underline"
                >
                  &larr; Voltar para o site
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="rounded-b-2xl bg-navy-dark px-8 py-5 text-center">
          <p className="text-xs italic text-white/40">
            Orquestrando o Futuro da Educação Pública
          </p>
          <p className="mt-1 text-xs text-white/30">
            &copy; {new Date().getFullYear()} Instituto i10 &middot;
            institutoi10.com.br
          </p>
        </div>
      </div>
    </main>
  );
}
