import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cartTotal, formatBRL, type CartItem } from "@/lib/cart";
import { estimarTempoCart } from "@/lib/tempo-preparo";

export function ConfirmarPedidoDialog({
  items,
  obsGeral,
  enviando,
  onConfirm,
}: {
  items: CartItem[];
  obsGeral: string;
  enviando: boolean;
  onConfirm: () => void;
}) {
  const total = cartTotal(items);
  const tempo = estimarTempoCart(items);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-semibold"
          disabled={enviando || items.length === 0}
        >
          Enviar pedido · {formatBRL(total)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar pedido?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                {items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-2 text-foreground">
                    <span className="min-w-0 truncate">
                      {it.quantidade}× {it.nome}
                      {it.observacao && (
                        <span className="block text-xs text-muted-foreground">
                          ↳ {it.observacao}
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBRL(it.preco * it.quantidade)}
                    </span>
                  </li>
                ))}
              </ul>
              {obsGeral && (
                <div className="rounded-lg bg-muted p-2 text-xs text-foreground">
                  <span className="font-semibold">Observação:</span> {obsGeral}
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" /> Estimativa ~{tempo} min
                </span>
                <span className="text-base font-bold text-primary">{formatBRL(total)}</span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Revisar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={enviando}
          >
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar e enviar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}