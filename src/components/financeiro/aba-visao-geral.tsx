import { AlertTriangle } from "lucide-react";
import { useResumoFinanceiro, type Periodo } from "@/hooks/use-financeiro";
import { formatBRL } from "@/lib/cart";
import { FinanceiroKpis } from "./financeiro-kpis";

export function AbaVisaoGeral({ restauranteId, periodo }: { restauranteId: string; periodo: Periodo }) {
  const { data, isLoading, error } = useResumoFinanceiro(restauranteId, periodo);
  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (error || !data) return <div className="text-sm text-destructive">Erro ao carregar o resumo.</div>;
  const vencidos = Number(data.qtd_vencidos);
  return (
    <div className="space-y-4">
      {vencidos > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">{vencidos} lançamento(s) vencido(s)</div>
            <p className="text-destructive/80">
              A pagar vencido: {formatBRL(Number(data.vencidos_pagar))} · A receber vencido:{" "}
              {formatBRL(Number(data.vencidos_receber))}
            </p>
          </div>
        </div>
      )}
      <FinanceiroKpis r={data} />
    </div>
  );
}
