import { AlertTriangle, Ban, Boxes, Wallet } from "lucide-react";
import { useResumoEstoque } from "@/hooks/use-estoque";
import { formatBRL } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";
import { formatQtd } from "./estoque-format";

function Kpi({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

export function AbaVisaoGeralEstoque({ restauranteId }: { restauranteId: string }) {
  const { data, isLoading } = useResumoEstoque(restauranteId);
  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Boxes} label="Insumos ativos" value={data.total_insumos} />
        <Kpi icon={AlertTriangle} label="Abaixo do mínimo" value={data.abaixo_minimo} />
        <Kpi icon={Ban} label="Zerados" value={data.zerados} />
        <Kpi icon={Wallet} label="Valor em estoque" value={formatBRL(Number(data.valor_total))} />
      </div>
      {data.produtos_bloqueados > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {data.produtos_bloqueados} produto(s) do cardápio estão indisponíveis por falta de estoque.
        </div>
      )}
      <section className="rounded-lg border border-border bg-card">
        <h2 className="border-b border-border p-4 text-base font-semibold">Alertas</h2>
        {data.alertas.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum insumo abaixo do mínimo.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.alertas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="font-medium">{a.nome}</span>
                <span className="flex items-center gap-2">
                  <span className={Number(a.saldo) <= 0 ? "text-destructive" : "text-muted-foreground"}>
                    {formatQtd(Number(a.saldo), a.unidade)} / mín. {formatQtd(Number(a.estoque_minimo), a.unidade)}
                  </span>
                  {a.bloquear_ao_zerar && <Badge variant="outline">Bloqueia venda</Badge>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
