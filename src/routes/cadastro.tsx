import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { usePlataformaConfig } from "@/hooks/use-plataforma-config";
import { montarLinkVendas } from "@/lib/vendas-link";
import gootableLogo from "@/assets/gootable-logo.png.asset.json";

const TITULO = "Cadastro GooTable — fale com a equipe comercial";
const DESCRICAO =
  "A criação de contas do GooTable é feita pela equipe comercial. Fale com vendas para contratar ou acesse o login do seu restaurante.";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const { data: plataformaConfig } = usePlataformaConfig();
  const vendas = montarLinkVendas(
    plataformaConfig?.vendas_whatsapp,
    plataformaConfig?.vendas_link,
    plataformaConfig?.vendas_mensagem,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={gootableLogo.url} alt="GooTable" className="h-14 w-auto" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Cadastro fechado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A criação de contas é feita exclusivamente pela equipe comercial.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {vendas && (
            <Button asChild className="w-full sm:w-auto">
              <a
                href={vendas.href}
                {...(vendas.isWhatsapp ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                Fale com vendas
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/login">Ir para o login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
