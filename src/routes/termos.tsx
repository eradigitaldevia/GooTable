import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/legal-layout";
import { TermosConteudo } from "@/components/legal/termos-conteudo";
import { LGPD_VERSAO } from "@/lib/lgpd";

const TITULO = "Termos de Uso — GooTable";
const DESC =
  "Termos de Uso da plataforma GooTable: cardápio digital por QR Code, pedidos, comandas e pagamentos para restaurantes.";

export const Route = createFileRoute("/termos")({
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
  component: TermosPage,
});

function TermosPage() {
  return (
    <LegalLayout titulo="Termos de Uso" atualizadoEm={`versão ${LGPD_VERSAO}`}>
      <TermosConteudo />
    </LegalLayout>
  );
}
