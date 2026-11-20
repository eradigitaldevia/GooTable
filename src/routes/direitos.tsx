import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/legal-layout";
import { DireitosConteudo } from "@/components/legal/direitos-conteudo";

const TITULO = "Direitos do titular (LGPD) — GooTable";
const DESC =
  "Solicite acesso, correção, portabilidade ou exclusão dos seus dados pessoais tratados na plataforma GooTable.";

export const Route = createFileRoute("/direitos")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DireitosPage,
});

function DireitosPage() {
  return (
    <LegalLayout titulo="Direitos do titular">
      <DireitosConteudo />
    </LegalLayout>
  );
}
