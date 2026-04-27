import { verifySubscribeToken } from "@/lib/tokens";
import SubscribeButton from "./SubscribeButton";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ email?: string; token?: string; source?: string }>;
}

export default async function SubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email ?? "";
  const token = params.token ?? "";
  const source = params.source ?? "organic";

  const valid = email && token && (await verifySubscribeToken(email, source, token));

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
                Link invalido
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Este link de inscricao e invalido ou expirou. Se voce acredita
                que isso e um erro, entre em contato conosco.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-navy">
                Confirmar inscricao
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Voce esta confirmando a inscricao do e-mail:
              </p>
              <p className="mt-2 rounded-lg bg-gray-50 px-4 py-3 text-center font-mono text-sm font-semibold text-navy">
                {email}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                Ao confirmar, voce passara a receber o{" "}
                <strong>i10 Insights</strong> — analise diaria sobre IA na
                educacao brasileira, todo dia util. Gratuito, sem spam. Cancele
                quando quiser.
              </p>

              <div className="mt-8">
                <SubscribeButton email={email} token={token} source={source} />
              </div>

              <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
                Em conformidade com a LGPD (Lei 13.709/2018). Seus dados sao
                usados exclusivamente para o envio do boletim e nunca serao
                compartilhados com terceiros.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="rounded-b-2xl bg-navy-dark px-8 py-5 text-center">
          <p className="text-xs italic text-white/40">
            Orquestrando o Futuro da Educacao Publica
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
