import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSalvarDeliveryBairro } from "@/hooks/use-delivery-bairros";
import type { DeliveryBairro } from "@/lib/delivery-bairros.functions";

export function BairroDialog({
  restauranteId,
  bairro,
  onClose,
}: {
  restauranteId: string;
  bairro: DeliveryBairro | null;
  onClose: () => void;
}) {
  const salvar = useSalvarDeliveryBairro(restauranteId);
  const [nome, setNome] = useState(bairro?.nome ?? "");
  const [taxa, setTaxa] = useState(bairro ? String(bairro.taxa).replace(".", ",") : "");
  const [ativo, setAtivo] = useState(bairro?.ativo ?? true);

  function submit() {
    const valor = Number(taxa.replace(",", ".") || "0");
    if (nome.trim().length < 2) return toast.error("Informe o nome do bairro");
    if (!Number.isFinite(valor) || valor < 0) return toast.error("Taxa inválida");
    salvar.mutate(
      { id: bairro?.id, nome: nome.trim(), taxa: valor, ativo },
      {
        onSuccess: () => {
          toast.success("Bairro salvo");
          onClose();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bairro ? "Editar bairro" : "Adicionar bairro"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="bairro-nome">Nome do bairro</Label>
            <Input id="bairro-nome" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bairro-taxa">Taxa de entrega (R$)</Label>
            <Input
              id="bairro-taxa"
              inputMode="decimal"
              value={taxa}
              placeholder="0,00"
              onChange={(e) => setTaxa(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="text-sm font-medium">Ativo</span>
            <Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Ativo" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={salvar.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
