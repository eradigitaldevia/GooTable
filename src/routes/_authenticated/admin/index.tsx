import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useDashboardAdmin } from "@/hooks/use-dashboard";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, CheckCircle2, Users, DollarSign } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { dashboardAdminFn } from "@/lib/dashboard.functions";
import { PageHeaderSkeleton } from "@/components/admin/skeletons/page-header-skeleton";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";

const DashboardChart = lazy(() => import("@/components/admin/dashboard-chart"));
const MetricasOperacionaisSection = lazy(() =>
  import("@/components/admin/metricas/metricas-operacionais-section").then((m) => ({
    default: m.MetricasOperacionaisSection,
  })),
);

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) => {
    const { queryClient, restauranteId } = context as {
      queryClient: import("@tanstack/react-query").QueryClient;
      restauranteId?: string;
    };
    if (restauranteId) {
      queryClient.ensureQueryData({
        queryKey: ["dashboard-admin", restauranteId],
        queryFn: () => dashboardAdminFn({ data: { restauranteId } }),
      });
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const restauranteId = restaurante?.id;
  const { data: resumo, isLoading } = useDashboardAdmin(restauranteId);
  const qc = useQueryClient();

  useEffect(() => {
    if (!restauranteId) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["dashboard-admin", restauranteId] });
        qc.invalidateQueries({ queryKey: ["dashboard-metricas", restauranteId] });
        timeout = null;
      }, 1500);
    };
    const channel = supabase
      .channel(`dash-${restauranteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `restaurante_id=eq.${restauranteId}` },
        () => {
          scheduleInvalidate();
        },
      )
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc]);

  const loading = isLoading || !restauranteId;

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton />
        <CardsGridSkeleton count={4} />
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  const stats = {
    emAndamento: resumo && !Array.isArray(resumo) ? resumo.emAndamento : 0,
    finalizadosHoje: resumo && !Array.isArray(resumo) ? resumo.finalizadosHoje : 0,
    mesasOcupadas: resumo && !Array.isArray(resumo) ? resumo.mesasOcupadas : 0,
    faturamentoHoje: resumo && !Array.isArray(resumo) ? resumo.faturamentoHoje : 0,
  };
  const chartData = resumo && !Array.isArray(resumo) ? resumo.chart7d : [];

  const cards = [
    { label: "Pedidos em andamento", value: stats.emAndamento, icon: ClipboardList, color: "text-primary" },
    { label: "Finalizados hoje", value: stats.finalizadosHoje, icon: CheckCircle2, color: "text-success" },
    { label: "Mesas ocupadas", value: stats.mesasOcupadas, icon: Users, color: "text-chart-3" },
    {
      label: "Faturamento hoje",
      value: formatBRL(stats.faturamentoHoje),
      icon: DollarSign,
      color: "text-chart-2",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral do seu restaurante hoje.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="mt-2 text-3xl font-bold tracking-tight">
                  {loading ? "—" : c.value}
                </div>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-accent ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 font-semibold">Faturamento — últimos 7 dias</h2>
        <p className="mb-4 text-xs text-muted-foreground">Pedidos entregues</p>
        <div className="h-64 w-full">
          <Suspense fallback={<div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />}>
            <DashboardChart data={chartData} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<div className="h-32 w-full animate-pulse rounded-xl bg-muted/40" />}>
        <MetricasOperacionaisSection restauranteId={restauranteId} />
      </Suspense>
    </div>
  );
}
