import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { SalaPedidoPronto } from "@/lib/sala.functions";

function minutosDesde(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function PratosProntosList({
  pedidos,
  onConfirmarEntrega,
  pendingId,
}: {
  pedidos: SalaPedidoPronto[];
  onConfirmarEntrega?: (pedidoId: string) => void;
  pendingId?: string | null;
}) {
  if (pedidos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Nenhum prato pronto no momento.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {pedidos.map((p) => {
        const min = minutosDesde(p.criado_em);
        const urg = min >= 5 ? "danger" : min >= 2 ? "warn" : "ok";
        const borda =
          urg === "danger"
            ? "border-l-destructive"
            : urg === "warn"
              ? "border-l-amber-500"
              : "border-l-emerald-500";
        const badge =
          urg === "danger"
            ? "bg-destructive/15 text-destructive"
            : urg === "warn"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
        return (
          <li
            key={p.id}
            className={`rounded-xl border border-l-4 bg-card p-4 shadow-sm ${borda}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold tracking-tight">Mesa {p.mesa_numero}</div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>
                pronto há {min} min
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {p.itens.map((it) => (
                <li key={it.id} className="leading-snug">
                  <span className="font-semibold">{it.quantidade}×</span>{" "}
                  {it.nome_produto}
                  {it.observacao && (
                    <span className="ml-2 inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {it.observacao}
                    </span>
                  )}
                  {it.cliente_nome && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({it.cliente_nome})
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {p.observacao && (
              <p className="mt-2 rounded-md bg-muted/60 px-2 py-1 text-xs italic text-muted-foreground">
                {p.observacao}
              </p>
            )}
            {onConfirmarEntrega && (
              <Button
                className="mt-3 w-full"
                size="lg"
                disabled={pendingId === p.id}
                onClick={() => onConfirmarEntrega(p.id)}
              >
                <Check className="mr-1 h-4 w-4" /> Confirmar entrega
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}