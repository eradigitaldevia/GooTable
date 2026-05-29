import { Button } from "@/components/ui/button";
import { Check, Minus, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemStatus = "pendente" | "em_preparo" | "pronto";

export interface BarItem {
  id: string;
  nome_produto: string;
  quantidade: number;
  quantidade_pronta: number;
  observacao: string | null;
  status: ItemStatus;
}

export function BarItemRow({
  item,
  mesa,
  criadoEm,
  pending,
  onMarcarTodas,
  onDecrementar,
}: {
  item: BarItem;
  mesa: string;
  criadoEm: string;
  pending: boolean;
  onMarcarTodas: () => void;
  onDecrementar: () => void;
}) {
  const minutos = Math.max(
    0,
    Math.floor((Date.now() - new Date(criadoEm).getTime()) / 60_000),
  );
  const urg = minutos >= 10 ? "danger" : minutos >= 5 ? "warn" : "ok";
  const tempoColor =
    urg === "danger"
      ? "text-destructive"
      : urg === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  const pronto = item.status === "pronto";
  const parcial = item.status === "em_preparo";

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0",
        pronto && "bg-emerald-500/5",
        parcial && "bg-amber-500/5",
      )}
    >
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="text-[10px] font-medium uppercase text-muted-foreground">
          Mesa
        </span>
        <span className="text-lg font-bold leading-none tabular-nums">{mesa}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className={cn("flex items-baseline gap-2", pronto && "text-muted-foreground")}>
          <span className="text-base font-bold tabular-nums">{item.quantidade}×</span>
          <span
            className={cn(
              "truncate font-medium",
              pronto && "line-through",
            )}
          >
            {item.nome_produto}
          </span>
          {item.quantidade > 1 && (
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {item.quantidade_pronta}/{item.quantidade}
            </span>
          )}
        </div>
        {item.observacao && (
          <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
            {item.observacao}
          </p>
        )}
      </div>

      <span className={cn("w-12 shrink-0 text-right text-xs font-semibold tabular-nums", tempoColor)}>
        {minutos}m
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {item.quantidade > 1 && !pronto && (
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={pending || item.quantidade_pronta <= 0}
            onClick={onDecrementar}
            aria-label="Diminuir prontos"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant={pronto ? "secondary" : "default"}
          disabled={pending}
          onClick={onMarcarTodas}
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
      </div>
    </div>
  );
}