import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Minus, Plus, Undo2 } from "lucide-react";

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";
type ItemStatus = "pendente" | "em_preparo" | "pronto";

interface Item {
  id: string;
  nome_produto: string;
  quantidade: number;
  observacao: string | null;
  status: ItemStatus;
  quantidade_pronta: number;
}

export function KdsCard({
  mesa,
  status,
  criadoEm,
  itens,
  observacao,
  onAvancar,
  loading,
  onMarcarItem,
  itemPendingId,
}: {
  mesa: string;
  status: StatusPedido;
  criadoEm: string;
  itens: Item[];
  observacao: string | null;
  onAvancar: () => void;
  loading?: boolean;
  onMarcarItem: (itemId: string, quantidadePronta: number) => void;
  itemPendingId?: string | null;
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

      <ul className="mt-3 space-y-2 text-sm">
        {itens.map((it) => {
          const pending = itemPendingId === it.id;
          const pronto = it.status === "pronto";
          const parcial = it.status === "em_preparo";
          return (
            <li
              key={it.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-md border border-transparent px-2 py-1.5 leading-snug",
                pronto && "border-emerald-500/30 bg-emerald-500/5",
                parcial && "border-amber-500/30 bg-amber-500/5",
              )}
            >
              <span
                className={cn(
                  "flex-1 min-w-0",
                  pronto && "text-muted-foreground line-through",
                )}
              >
                <span className="font-semibold">{it.quantidade}×</span>{" "}
                <span>{it.nome_produto}</span>
                {it.observacao && (
                  <span className="ml-2 inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {it.observacao}
                  </span>
                )}
              </span>

              {it.quantidade > 1 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    pronto
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : parcial
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {it.quantidade_pronta} / {it.quantidade}
                </span>
              )}

              {it.quantidade === 1 ? (
                <Button
                  size="sm"
                  variant={pronto ? "secondary" : "default"}
                  disabled={pending}
                  onClick={() => onMarcarItem(it.id, pronto ? 0 : 1)}
                >
                  {pronto ? (
                    <>
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Desfazer
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Pronto
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={pending || it.quantidade_pronta <= 0}
                    onClick={() => onMarcarItem(it.id, it.quantidade_pronta - 1)}
                    aria-label="Diminuir prontos"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={pending || it.quantidade_pronta >= it.quantidade}
                    onClick={() => onMarcarItem(it.id, it.quantidade_pronta + 1)}
                    aria-label="Aumentar prontos"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant={pronto ? "secondary" : "default"}
                    disabled={pending}
                    onClick={() =>
                      onMarcarItem(it.id, pronto ? 0 : it.quantidade)
                    }
                  >
                    {pronto ? "Desfazer" : "Tudo"}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
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