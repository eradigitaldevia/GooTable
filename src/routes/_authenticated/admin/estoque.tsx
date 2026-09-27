import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AbaVisaoGeralEstoque } from "@/components/estoque/aba-visao-geral-estoque";
import { AbaInsumos } from "@/components/estoque/aba-insumos";
import { AbaFichas } from "@/components/estoque/aba-fichas";
import { AbaMovimentos } from "@/components/estoque/aba-movimentos";
import { AbaInventario } from "@/components/estoque/aba-inventario";

const TABS = ["visao-geral", "insumos", "fichas", "movimentacoes", "inventario"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  validateSearch: z.object({ tab: z.enum(TABS).default("visao-geral") }),
  head: () => ({ meta: [{ title: "Estoque — Admin" }] }),
  component: EstoquePage,
});

function EstoquePage() {
  const { user } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  if (isLoading || !restaurante) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const rid = restaurante.id;

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
        <p className="mt-1 text-sm text-muted-foreground">Insumos, fichas técnicas, movimentações e inventário.</p>
      </header>
      {!restaurante.estoque_ativo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-4 text-sm">
          <span>O controle de estoque está desligado: as vendas não descontam insumos.</span>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/configuracoes" search={{ tab: "estoque" }}>Ativar em Configurações</Link>
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="insumos">Insumos</TabsTrigger>
          <TabsTrigger value="fichas">Fichas técnicas</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="inventario">Inventário</TabsTrigger>
        </TabsList>
        <TabsContent value="visao-geral" className="mt-4"><AbaVisaoGeralEstoque restauranteId={rid} /></TabsContent>
        <TabsContent value="insumos" className="mt-4"><AbaInsumos restauranteId={rid} /></TabsContent>
        <TabsContent value="fichas" className="mt-4"><AbaFichas restauranteId={rid} /></TabsContent>
        <TabsContent value="movimentacoes" className="mt-4"><AbaMovimentos restauranteId={rid} /></TabsContent>
        <TabsContent value="inventario" className="mt-4"><AbaInventario restauranteId={rid} /></TabsContent>
      </Tabs>
    </div>
  );
}
