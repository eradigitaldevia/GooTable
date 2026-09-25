import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useIntegrarRepasses, type Periodo } from "@/hooks/use-financeiro";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataLocal, inicioDoMes } from "@/lib/data-fuso";
import type { Lancamento } from "@/lib/financeiro.functions";
import { FinanceiroHeader } from "@/components/financeiro/financeiro-header";
import { AbaVisaoGeral } from "@/components/financeiro/aba-visao-geral";
import { AbaLancamentos } from "@/components/financeiro/aba-lancamentos";
import { AbaDre } from "@/components/financeiro/aba-dre";
import { AbaFluxoCaixa } from "@/components/financeiro/aba-fluxo-caixa";
import { AbaCategoriasFornecedores } from "@/components/financeiro/aba-categorias-fornecedores";
import { NovoLancamentoDialog } from "@/components/financeiro/novo-lancamento-dialog";

const TABS = ["visao-geral", "pagar", "receber", "dre", "fluxo", "cadastros"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  validateSearch: z.object({ tab: z.enum(TABS).default("visao-geral") }),
  head: () => ({ meta: [{ title: "Financeiro — Admin" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { user } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [periodo, setPeriodo] = useState<Periodo>(() => ({ inicio: dataLocal(inicioDoMes()), fim: dataLocal() }));
  const [dialog, setDialog] = useState<{ open: boolean; editar: Lancamento | null }>({ open: false, editar: null });
  const integrar = useIntegrarRepasses();
  const onEditar = useCallback((l: Lancamento) => setDialog({ open: true, editar: l }), []);

  if (isLoading || !restaurante) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const rid = restaurante.id;

  const onIntegrar = () =>
    integrar.mutate(rid, {
      onSuccess: (r) => toast.success(r.count > 0 ? `${r.count} lançamento(s) importado(s)` : "Nada novo para importar"),
      onError: (e) => toast.error(e.message),
    });

  return (
    <div className="max-w-6xl space-y-6">
      <FinanceiroHeader
        periodo={periodo}
        onPeriodo={setPeriodo}
        onNovo={() => setDialog({ open: true, editar: null })}
        onIntegrar={onIntegrar}
        integrando={integrar.isPending}
      />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="pagar">Contas a pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="dre">DRE gerencial</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="cadastros">Categorias & fornecedores</TabsTrigger>
        </TabsList>
        <TabsContent value="visao-geral" className="mt-4"><AbaVisaoGeral restauranteId={rid} periodo={periodo} /></TabsContent>
        <TabsContent value="pagar" className="mt-4">
          <AbaLancamentos restauranteId={rid} periodo={periodo} tipo="pagar" onEditar={onEditar} />
        </TabsContent>
        <TabsContent value="receber" className="mt-4">
          <AbaLancamentos restauranteId={rid} periodo={periodo} tipo="receber" onEditar={onEditar} />
        </TabsContent>
        <TabsContent value="dre" className="mt-4"><AbaDre restauranteId={rid} periodo={periodo} /></TabsContent>
        <TabsContent value="fluxo" className="mt-4"><AbaFluxoCaixa restauranteId={rid} periodo={periodo} /></TabsContent>
        <TabsContent value="cadastros" className="mt-4"><AbaCategoriasFornecedores restauranteId={rid} /></TabsContent>
      </Tabs>
      <NovoLancamentoDialog
        restauranteId={rid}
        open={dialog.open}
        editar={dialog.editar}
        tipoPadrao={tab === "receber" ? "receber" : "pagar"}
        onClose={() => setDialog({ open: false, editar: null })}
      />
    </div>
  );
}
