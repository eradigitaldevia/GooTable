import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
import { cancelarItemPedidoPublicoFn } from "@/lib/status-pedido-publico.functions";

export function CancelarItemButton({
  qrToken,
  pedidoId,
  itemId,
  nome,
  comandaId,
}: {
  qrToken: string;
  pedidoId: string;
  itemId: string;
  nome: string;
  comandaId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fn = useServerFn(cancelarItemPedidoPublicoFn);
  const qc = useQueryClient();

  const cancelar = async () => {
    try {
      setEnviando(true);
      const r = await fn({ data: { qrToken, pedidoId, itemId } });
      if ("erro" in r) {
        toast.error(r.erro);
        return;
      }
      toast.success("Item cancelado");
      qc.invalidateQueries({ queryKey: ["status-pedido-publico", qrToken, pedidoId] });
      if (comandaId) qc.invalidateQueries({ queryKey: ["pedidos-comanda", qrToken, comandaId] });
      qc.invalidateQueries({ queryKey: ["resumo-conta", qrToken] });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao cancelar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Cancelar
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar este item?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{nome}&quot; será removido do pedido. Isso só é possível enquanto a cozinha
            ainda não iniciou o preparo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              cancelar();
            }}
            disabled={enviando}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cancelar item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}