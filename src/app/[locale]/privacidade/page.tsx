import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Política de Privacidade · Privacy Policy",
  robots: { index: true, follow: true },
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale === "pt" ? <PT /> : <EN />;
}

const containerCls =
  "mx-auto max-w-3xl px-6 py-12 sm:py-16 text-gray-800 leading-7";
const h1Cls = "font-serif text-3xl text-navy sm:text-4xl";
const h2Cls = "font-serif text-2xl text-navy mt-10";
const pCls = "mt-4";
const ulCls = "mt-4 list-disc pl-6 space-y-1";

function PT() {
  return (
    <article className={containerCls}>
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
        Instituto i10
      </p>
      <h1 className={h1Cls}>Política de Privacidade — i10 Insights</h1>
      <p className={pCls}>
        Esta política descreve como o Instituto i10 (&quot;i10&quot;,
        &quot;nós&quot;) coleta, usa e protege dados pessoais quando você se
        cadastra no boletim do i10 Insights ou navega em
        institutoi10.com.br/insights. Adotamos a Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018, &quot;LGPD&quot;) como nosso padrão.
      </p>

      <h2 className={h2Cls}>Quais dados coletamos</h2>
      <ul className={ulCls}>
        <li>
          <strong>Endereço de e-mail</strong> — quando você se cadastra no
          boletim. Único dado obrigatório.
        </li>
        <li>
          <strong>Idioma escolhido</strong> (PT ou EN) — para enviar conteúdo
          no idioma certo.
        </li>
        <li>
          <strong>Endereço IP e User-Agent</strong> no momento do cadastro —
          mantidos exclusivamente como trilha de auditoria do consentimento,
          conforme exigido pela LGPD.
        </li>
        <li>
          <strong>Versão do texto de consentimento</strong> que você visualizou
          no momento do cadastro.
        </li>
      </ul>

      <h2 className={h2Cls}>Base legal</h2>
      <p className={pCls}>
        Tratamos seus dados com base no <strong>consentimento livre,
        informado e inequívoco</strong> (Art. 7º, inciso I da LGPD), obtido
        por meio de fluxo de confirmação dupla (double opt-in): após o
        cadastro, enviamos um e-mail solicitando que você confirme a inscrição.
        Sem a confirmação, seus dados não entram em nossa base ativa.
      </p>

      <h2 className={h2Cls}>Como usamos</h2>
      <ul className={ulCls}>
        <li>Enviar o boletim diário do i10 Insights no idioma escolhido.</li>
        <li>
          Manter trilha de auditoria do consentimento, conforme obrigação
          legal.
        </li>
        <li>
          Métricas agregadas e anônimas (taxa de abertura, cliques) para
          melhorar o conteúdo. Não realizamos perfilamento individual.
        </li>
      </ul>

      <h2 className={h2Cls}>Compartilhamento</h2>
      <p className={pCls}>
        Seus dados não são vendidos, alugados ou transferidos para terceiros
        com fins comerciais. Utilizamos os seguintes operadores estritamente
        necessários para a entrega do serviço:
      </p>
      <ul className={ulCls}>
        <li>
          <strong>Resend</strong> (envio de e-mail transacional) — sediado nos
          EUA, sob cláusulas contratuais padrão.
        </li>
        <li>
          <strong>Vercel</strong> (hospedagem) — sediado nos EUA, sob
          cláusulas contratuais padrão.
        </li>
        <li>
          <strong>Neon</strong> (banco de dados Postgres) — sediado nos EUA,
          sob cláusulas contratuais padrão.
        </li>
      </ul>

      <h2 className={h2Cls}>Seus direitos (Art. 18 LGPD)</h2>
      <p className={pCls}>Você pode, a qualquer momento:</p>
      <ul className={ulCls}>
        <li>Confirmar a existência de tratamento de seus dados.</li>
        <li>Acessar e solicitar cópia dos dados que mantemos sobre você.</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
        <li>Solicitar a exclusão definitiva (apagamento) dos seus dados.</li>
        <li>Revogar o consentimento — basta clicar em &quot;cancelar
          inscrição&quot; em qualquer e-mail recebido.</li>
        <li>Solicitar a portabilidade dos dados a outro fornecedor.</li>
      </ul>

      <h2 className={h2Cls}>Contato — Encarregado de Dados (DPO)</h2>
      <p className={pCls}>
        Para exercer qualquer direito ou tirar dúvidas sobre o tratamento de
        seus dados, escreva para{" "}
        <a
          href="mailto:dpo@institutoi10.com.br"
          className="text-navy underline"
        >
          dpo@institutoi10.com.br
        </a>
        . Respondemos em até 15 dias úteis.
      </p>

      <h2 className={h2Cls}>Retenção</h2>
      <p className={pCls}>
        Mantemos seu e-mail enquanto você permanecer inscrito. Ao cancelar a
        inscrição, removemos o e-mail da base ativa em até 24 horas. A trilha
        de auditoria do consentimento (versão do texto, data, IP/UA do
        cadastro) é mantida por 5 anos após o cancelamento, conforme
        recomendação da ANPD para fins de comprovação.
      </p>

      <h2 className={h2Cls}>Atualizações</h2>
      <p className={pCls}>
        Última atualização: 26 de abril de 2026. Avisaremos por e-mail caso
        haja mudança material nesta política.
      </p>
    </article>
  );
}

function EN() {
  return (
    <article className={containerCls}>
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
        Instituto i10
      </p>
      <h1 className={h1Cls}>Privacy Policy — i10 Insights</h1>
      <p className={pCls}>
        This policy describes how Instituto i10 (&quot;i10&quot;, &quot;we&quot;)
        collects, uses, and protects personal data when you sign up for the i10
        Insights newsletter or browse institutoi10.com.br/insights. We follow
        Brazil&apos;s LGPD (Law 13.709/2018) as our baseline; the policy is
        also designed to be compatible with GDPR principles.
      </p>

      <h2 className={h2Cls}>What we collect</h2>
      <ul className={ulCls}>
        <li>
          <strong>Email address</strong> — when you subscribe to the newsletter.
          The only required data point.
        </li>
        <li>
          <strong>Chosen language</strong> (PT or EN) — to send content in the
          right language.
        </li>
        <li>
          <strong>IP address and User-Agent</strong> at signup — kept solely
          as a consent audit trail, as required by LGPD.
        </li>
        <li>
          <strong>Version of consent text</strong> you saw at signup.
        </li>
      </ul>

      <h2 className={h2Cls}>Legal basis</h2>
      <p className={pCls}>
        We process your data based on <strong>free, informed, and unambiguous
        consent</strong> (LGPD Art. 7, I), obtained via a double opt-in flow:
        after signup, we send a confirmation email. Without confirmation, your
        data does not enter our active list.
      </p>

      <h2 className={h2Cls}>How we use it</h2>
      <ul className={ulCls}>
        <li>Send the daily i10 Insights newsletter in your chosen language.</li>
        <li>Maintain consent audit trail per legal obligation.</li>
        <li>
          Aggregate, anonymous metrics (open rate, clicks) to improve content.
          We do not profile individuals.
        </li>
      </ul>

      <h2 className={h2Cls}>Sharing</h2>
      <p className={pCls}>
        Your data is not sold, rented, or transferred to third parties for
        commercial purposes. We use the following processors, strictly
        necessary to deliver the service:
      </p>
      <ul className={ulCls}>
        <li>
          <strong>Resend</strong> (transactional email) — US-based, standard
          contractual clauses.
        </li>
        <li>
          <strong>Vercel</strong> (hosting) — US-based, standard contractual
          clauses.
        </li>
        <li>
          <strong>Neon</strong> (Postgres database) — US-based, standard
          contractual clauses.
        </li>
      </ul>

      <h2 className={h2Cls}>Your rights (LGPD Art. 18)</h2>
      <p className={pCls}>At any time you may:</p>
      <ul className={ulCls}>
        <li>Confirm whether we process your data.</li>
        <li>Access and request a copy of the data we hold about you.</li>
        <li>Correct incomplete, inaccurate, or outdated data.</li>
        <li>Request permanent deletion of your data.</li>
        <li>
          Revoke consent — click &quot;unsubscribe&quot; in any email we send.
        </li>
        <li>Request data portability to another provider.</li>
      </ul>

      <h2 className={h2Cls}>Contact — Data Protection Officer</h2>
      <p className={pCls}>
        To exercise any right or ask about our data handling, write to{" "}
        <a
          href="mailto:dpo@institutoi10.com.br"
          className="text-navy underline"
        >
          dpo@institutoi10.com.br
        </a>
        . We respond within 15 business days.
      </p>

      <h2 className={h2Cls}>Retention</h2>
      <p className={pCls}>
        We keep your email while you remain subscribed. Upon unsubscribe, we
        remove the email from the active list within 24 hours. The consent
        audit trail (text version, date, IP/UA at signup) is retained for 5
        years after unsubscribe, per ANPD guidance for legal-proof purposes.
      </p>

      <h2 className={h2Cls}>Updates</h2>
      <p className={pCls}>
        Last updated: April 26, 2026. We will notify you by email if there is
        a material change to this policy.
      </p>
    </article>
  );
}
