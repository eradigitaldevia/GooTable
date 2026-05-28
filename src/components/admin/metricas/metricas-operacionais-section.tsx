import { lazy, Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardMetricasOperacionais } from "@/hooks/use-dashboard";
import type { DashboardMetricasPeriodo } from "@/lib/dashboard.functions";
import { FilaCards } from "./fila-cards";
import { TempoFasesCards } from "./tempo-fases-cards";

const ThroughputChart = lazy(() => import("./throughput-chart"));

interface Props {
  restauranteId: string | undefined;
}

export function MetricasOperacionaisSection({ restauranteId }: Props) {
  const [periodo, setPeriodo] = useState<DashboardMetricasPeriodo>("hoje");
  const { data, isLoading } = useDashboardMetricasOperacionais(restauranteId, periodo);

  const fila = data?.fila ?? { recebido: 0, em_preparo: 0, pronto: 0, mais_antigo_min: 0 };
  const tempos = data?.tempoFases ?? {
    recebidoParaPreparoMin: 0,
    preparoParaProntoMin: 0,
    prontoParaEntregueMin: 0,
    cicloTotalMin: 0,
  };
  const throughput = data?.throughput24h ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Métricas operacionais</h2>
          <p className="text-sm text-muted-foreground">Tempo por fase, fila e throughput.</p>
        </div>
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as DashboardMetricasPeriodo)}>
          <TabsList>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fila atual</div>
        <FilaCards fila={fila} />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tempo médio por fase
        </div>
        <TempoFasesCards tempos={tempos} />
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="mb-1 font-semibold">Throughput por hora</h3>
        <p className="mb-4 text-xs text-muted-foreground">Pedidos entregues no período</p>
        <div className="h-64 w-full">
          {isLoading ? (
            <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <Suspense fallback={<div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />}>
              <ThroughputChart data={throughput} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  );
}