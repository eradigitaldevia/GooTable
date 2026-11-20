import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/legal-layout";
import { PrivacidadeConteudo } from "@/components/legal/privacidade-conteudo";
import { LGPD_VERSAO } from "@/lib/lgpd";

const TITULO = "Política de Privacidade — GooTable";
const DESC =
  "Como a Mesa coleta, usa, compartilha e protege dados pessoais de restaurantes e clientes, conforme a LGPD.";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <LegalLayout titulo="Política de Privacidade" atualizadoEm={`versão ${LGPD_VERSAO}`}>
      <PrivacidadeConteudo />
    </LegalLayout>
  );
}
