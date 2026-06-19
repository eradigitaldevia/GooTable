import { Utensils } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { useDashboardTicketMedioMesa } from "@/hooks/use-dashboard";
import type { DashboardMetricasPeriodo } from "@/lib/dashboard.functions";

interface Props {
  restauranteId: string | undefined;
  periodo: DashboardMetricasPeriodo;
}

export function TicketMedioMesaCard({ restauranteId, periodo }: Props) {
  const { data, isLoading } = useDashboardTicketMedioMesa(restauranteId, periodo);
  const ticket = data?.ticketMedio ?? 0;
  const mesas = data?.mesasAtendidas ?? 0;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Ticket médio por mesa</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">
            {isLoading ? "—" : formatBRL(ticket)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isLoading ? "\u00A0" : `${mesas} ${mesas === 1 ? "mesa atendida" : "mesas atendidas"}`}
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-chart-2">
          <Utensils className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}