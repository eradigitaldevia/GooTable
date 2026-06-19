import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardMetricasPeriodo } from "@/lib/dashboard.functions";
import { ProdutosTopCard } from "./produtos-top-card";
import { TicketMedioMesaCard } from "./ticket-medio-mesa-card";

interface Props {
  restauranteId: string | undefined;
}

export function VendasSection({ restauranteId }: Props) {
  const [periodo, setPeriodo] = useState<DashboardMetricasPeriodo>("hoje");

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Vendas</h2>
          <p className="text-sm text-muted-foreground">Produtos mais vendidos e ticket médio.</p>
        </div>
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as DashboardMetricasPeriodo)}>
          <TabsList>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProdutosTopCard restauranteId={restauranteId} periodo={periodo} />
        </div>
        <TicketMedioMesaCard restauranteId={restauranteId} periodo={periodo} />
      </div>
    </section>
  );
}