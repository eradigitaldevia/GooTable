import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function CancelarLoteDialog({
  open,
  onOpenChange,
  quantidade,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quantidade: number;
  onConfirm: (motivo: string) => void;
  loading?: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar {quantidade} pedido(s)?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Informe um motivo (obrigatório se algum item já estiver em preparo).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo-lote">Motivo</Label>
          <Textarea
            id="motivo-lote"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: pedidos órfãos de teste"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              onConfirm(motivo.trim());
            }}
          >
            {loading ? "Cancelando..." : "Confirmar cancelamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}