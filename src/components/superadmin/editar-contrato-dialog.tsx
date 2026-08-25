import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAtualizarContratoRestaurante } from "@/hooks/use-superadmin";

export function EditarContratoDialog({
  open,
  onClose,
  restaurante,
}: {
  open: boolean;
  onClose: () => void;
  restaurante: { id: string; nome: string; contrato_vencimento_em?: string | null; contrato_notas?: string | null } | null;
}) {
  const atualizar = useAtualizarContratoRestaurante();
  const [vencimento, setVencimento] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open && restaurante) {
      setVencimento(restaurante.contrato_vencimento_em ?? "");
      setNotas(restaurante.contrato_notas ?? "");
    }
  }, [open, restaurante]);

  const submit = async () => {
    if (!restaurante) return;
    try {
      await atualizar.mutateAsync({ id: restaurante.id, vencimento: vencimento || null, notas: notas || null });
      toast.success("Contrato atualizado");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contrato — {restaurante?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Vencimento</Label>
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
          <div>
            <Label>Notas comerciais</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Plano, observações…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={atualizar.isPending}>
            {atualizar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
