import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Trash2 } from "lucide-react";
import { formatBRL, type CartItem } from "@/lib/cart";

export function CarrinhoItemRow({
  item,
  idx,
  onSetQtd,
  onSetNome,
}: {
  item: CartItem;
  idx: number;
  onSetQtd: (idx: number, q: number) => void;
  onSetNome: (idx: number, nome: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{item.nome}</div>
          {item.cliente_nome && (
            <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {item.cliente_nome}
            </span>
          )}
          {item.observacao && (
            <p className="mt-1 text-xs text-muted-foreground">Obs: {item.observacao}</p>
          )}
          <div className="mt-1 text-sm text-primary font-semibold">
            {formatBRL(item.preco * item.quantidade)}
          </div>
        </div>
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onSetQtd(idx, 0)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Input
          placeholder="Nome (opcional)"
          value={item.cliente_nome ?? ""}
          onChange={(e) => onSetNome(idx, e.target.value)}
          className="h-9 max-w-[200px]"
        />
        <div className="flex items-center gap-2 rounded-full border p-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => onSetQtd(idx, item.quantidade - 1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => onSetQtd(idx, item.quantidade + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
