import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/cart";
import { cn } from "@/lib/utils";
import type { ResumoFinanceiro } from "@/lib/financeiro.functions";

function Kpi({ label, valor, destaque }: { label: string; valor: number; destaque?: "pos" | "neg" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-1 text-xl font-semibold tabular-nums",
            destaque === "pos" && "text-primary",
            destaque === "neg" && "text-destructive",
          )}
        >
          {formatBRL(valor)}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinanceiroKpis({ r }: { r: ResumoFinanceiro }) {
  const saldo = Number(r.saldo_periodo);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Saldo do período" valor={saldo} destaque={saldo >= 0 ? "pos" : "neg"} />
      <Kpi label="Faturamento (vendas)" valor={Number(r.faturamento)} />
      <Kpi label="Despesas pagas" valor={Number(r.pago)} />
      <Kpi label="Outras receitas recebidas" valor={Number(r.recebido)} />
      <Kpi label="A pagar hoje" valor={Number(r.a_pagar_hoje)} />
      <Kpi label="A pagar em 7 dias" valor={Number(r.a_pagar_semana)} />
      <Kpi label="A pagar no período" valor={Number(r.a_pagar)} />
      <Kpi label="A receber no período" valor={Number(r.a_receber)} />
    </div>
  );
}
