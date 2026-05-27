import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Building2, CheckCircle2, XCircle, Receipt, DollarSign, TrendingUp } from "lucide-react";
import { useDashboardSuperadmin } from "@/hooks/use-dashboard";
import { StatCard } from "@/components/superadmin/stat-card";
import { Card } from "@/components/ui/card";
import { TopRestaurantes } from "@/components/superadmin/top-restaurantes";

const FaturamentoChart = lazy(() => import("@/components/superadmin/faturamento-chart"));

export const Route = createFileRoute("/superadmin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useDashboardSuperadmin();

  const stats = {
    total: data?.total ?? 0,
    ativos: data?.ativos ?? 0,
    suspensos: data?.suspensos ?? 0,
    pedidosHoje: data?.pedidosHoje ?? 0,
    faturamentoHoje: data?.faturamentoHoje ?? 0,
    faturamentoMes: data?.faturamentoMes ?? 0,
  };
  const chart = data?.chart30d ?? [];
  const topRest = data?.topRestaurantes ?? [];

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Métricas de toda a plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Restaurantes" value={String(stats.total)} icon={Building2} />
        <StatCard label="Ativos" value={String(stats.ativos)} icon={CheckCircle2} accent="text-emerald-500" />
        <StatCard label="Suspensos" value={String(stats.suspensos)} icon={XCircle} accent="text-rose-500" />
        <StatCard label="Pedidos hoje" value={String(stats.pedidosHoje)} icon={Receipt} />
        <StatCard label="Faturamento hoje" value={fmt(stats.faturamentoHoje)} icon={DollarSign} />
        <StatCard label="Faturamento mês" value={fmt(stats.faturamentoMes)} icon={TrendingUp} />
      </div>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">Faturamento — últimos 30 dias</h2>
        <div className="h-72">
          <Suspense fallback={null}>
            <FaturamentoChart data={chart} fmt={fmt} />
          </Suspense>
        </div>
      </Card>
      <TopRestaurantes itens={topRest} fmt={fmt} />
    </div>
  );
}
