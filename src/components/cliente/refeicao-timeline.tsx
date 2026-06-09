import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChefHat, Clock, XCircle, Truck } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import type { PedidoComandaResumo } from "@/lib/status-pedido-publico.functions";

const STATUS_META: Record<
  PedidoComandaResumo["status"],
  { label: string; Icon: typeof Clock; cls: string }
> = {
  recebido: { label: "Recebido", Icon: Clock, cls: "text-muted-foreground" },
  em_preparo: { label: "Preparando", Icon: ChefHat, cls: "text-amber-600 dark:text-amber-400" },
  pronto: { label: "Pronto", Icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400" },
  entregue: { label: "Entregue", Icon: Truck, cls: "text-primary" },
  cancelado: { label: "Cancelado", Icon: XCircle, cls: "text-destructive" },
};

export function RefeicaoTimeline({
  qrToken,
  pedidos,
  atualId,
}: {
  qrToken: string;
  pedidos: PedidoComandaResumo[];
  atualId: string;
}) {
  if (pedidos.length <= 1) return null;
  const totalRefeicao = pedidos
    .filter((p) => p.status !== "cancelado")
    .reduce((s, p) => s + p.total, 0);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Sua refeição</h2>
        <span className="text-sm font-bold text-primary">{formatBRL(totalRefeicao)}</span>
      </div>
      <ol className="space-y-2">
        {pedidos.map((p, idx) => {
          const meta = STATUS_META[p.status];
          const ativo = p.id === atualId;
          const Icon = meta.Icon;
          return (
            <li key={p.id}>
              <Link
                to="/m/$qrToken/status/$pedidoId"
                params={{ qrToken, pedidoId: p.id }}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  ativo ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${meta.cls}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>Pedido #{idx + 1}</span>
                    <span className={`text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.itens_prontos}/{p.itens_total} itens prontos
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatBRL(p.total)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}