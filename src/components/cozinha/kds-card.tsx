import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

interface Item {
  id: string;
  nome_produto: string;
  quantidade: number;
  observacao: string | null;
}

export function KdsCard({
  mesa,
  status,
  criadoEm,
  itens,
  observacao,
  onAvancar,
  loading,
}: {
  mesa: string;
  status: StatusPedido;
  criadoEm: string;
  itens: Item[];
  observacao: string | null;
  onAvancar: () => void;
  loading?: boolean;
}) {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(criadoEm).getTime()) / 60000));
  const urg =
    minutos >= 15 ? "danger" : minutos >= 8 ? "warn" : "ok";

  const borderColor =
    urg === "danger"
      ? "border-l-destructive"
      : urg === "warn"
        ? "border-l-amber-500"
        : "border-l-emerald-500";

  const badgeColor =
    urg === "danger"
      ? "bg-destructive/15 text-destructive"
      : urg === "warn"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 bg-card p-4 shadow-sm",
        borderColor,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-base font-bold tracking-tight">Mesa {mesa}</div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badgeColor)}>
          {minutos} min
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm">
        {itens.map((it) => (
          <li key={it.id} className="leading-snug">
            <span className="font-semibold">{it.quantidade}×</span>{" "}
            <span>{it.nome_produto}</span>
            {it.observacao && (
              <span className="ml-2 inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {it.observacao}
              </span>
            )}
          </li>
        ))}
      </ul>

      {observacao && (
        <p className="mt-2 rounded-md bg-muted/60 px-2 py-1 text-xs italic text-muted-foreground">
          {observacao}
        </p>
      )}

      <Button
        className="mt-4 w-full"
        size="lg"
        variant={status === "recebido" ? "secondary" : "default"}
        disabled={loading}
        onClick={onAvancar}
      >
        {status === "recebido" ? "Iniciar preparo →" : "Marcar como pronto →"}
      </Button>
    </div>
  );
}