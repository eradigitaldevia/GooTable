import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  restaurante: {
    id: string;
    nome: string;
    contrato_vencimento_em?: string | null;
    contrato_notas?: string | null;
    contrato_bloqueio_automatico?: boolean | null;
  } | null;
}) {
  const atualizar = useAtualizarContratoRestaurante();
  const [vencimento, setVencimento] = useState("");
  const [notas, setNotas] = useState("");
  const [bloqueio, setBloqueio] = useState(false);

  useEffect(() => {
    if (open && restaurante) {
      setVencimento(restaurante.contrato_vencimento_em ?? "");
      setNotas(restaurante.contrato_notas ?? "");
      setBloqueio(!!restaurante.contrato_bloqueio_automatico);
    }
  }, [open, restaurante]);

  const submit = async () => {
    if (!restaurante) return;
    try {
      await atualizar.mutateAsync({
        id: restaurante.id,
        vencimento: vencimento || null,
        notas: notas || null,
        bloqueioAutomatico: bloqueio,
      });
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
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <Label className="cursor-pointer" htmlFor="bloqueio-auto">
                Suspender automaticamente ao vencer
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {bloqueio
                  ? "Ao passar do vencimento, o cardápio por QR, o delivery e novos pedidos ficam bloqueados. Reativar é manual."
                  : "O vencimento apenas gera alerta nesta lista; nada é bloqueado."}
              </p>
            </div>
            <Switch id="bloqueio-auto" checked={bloqueio} onCheckedChange={setBloqueio} disabled={!vencimento} />
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
