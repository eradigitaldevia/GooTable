import { Package } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { useDashboardProdutosTop } from "@/hooks/use-dashboard";
import type { DashboardMetricasPeriodo } from "@/lib/dashboard.functions";

interface Props {
  restauranteId: string | undefined;
  periodo: DashboardMetricasPeriodo;
}

export function ProdutosTopCard({ restauranteId, periodo }: Props) {
  const { data, isLoading } = useDashboardProdutosTop(restauranteId, periodo, 5);
  const itens = data ?? [];
  const maxQtd = itens.reduce((m, i) => (i.quantidade > m ? i.quantidade : m), 0);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Produtos mais vendidos</h3>
          <p className="text-xs text-muted-foreground">Top 5 por quantidade</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
          <Package className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sem vendas no período.
        </p>
      ) : (
        <ol className="space-y-3">
          {itens.map((p, idx) => {
            const pct = maxQtd > 0 ? (p.quantidade / maxQtd) * 100 : 0;
            return (
              <li key={p.produto_id ?? idx} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <span className="truncate font-medium">{p.nome}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{p.quantidade}</span>
                    {" · "}
                    {formatBRL(p.faturamento)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}