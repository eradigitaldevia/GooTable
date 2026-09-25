import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlterarStatusLancamento } from "@/hooks/use-financeiro";
import type { Lancamento } from "@/lib/financeiro.functions";
import { formatBRL } from "@/lib/cart";
import { dataLocal } from "@/lib/data-fuso";
import { FormaPagamentoSelect } from "./forma-pagamento-select";

export function BaixarLancamentoDialog({
  restauranteId, lancamento, onClose,
}: { restauranteId: string; lancamento: Lancamento | null; onClose: () => void }) {
  const [data, setData] = useState(dataLocal());
  const [forma, setForma] = useState("pix");
  const alterar = useAlterarStatusLancamento();

  useEffect(() => {
    if (lancamento) {
      setData(dataLocal());
      setForma(lancamento.forma_pagamento ?? "pix");
    }
  }, [lancamento]);

  const confirmar = () => {
    if (!lancamento) return;
    alterar.mutate(
      { restauranteId, id: lancamento.id, acao: "baixar", dataPagamento: data, formaPagamento: forma },
      {
        onSuccess: () => { toast.success("Baixa registrada"); onClose(); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={!!lancamento} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dar baixa</DialogTitle>
        </DialogHeader>
        {lancamento && (
          <div className="space-y-4">
            <div className="text-sm">
              {lancamento.descricao} · <span className="font-semibold">{formatBRL(lancamento.valor)}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Data do pagamento</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <FormaPagamentoSelect value={forma} onChange={setForma} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={alterar.isPending || !data}>Confirmar baixa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
