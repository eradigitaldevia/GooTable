import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInsumos, useProduzirPreparo } from "@/hooks/use-estoque";
import { parseNum } from "./estoque-format";

export function ProducaoDialog({ restauranteId, open, onClose }: { restauranteId: string; open: boolean; onClose: () => void }) {
  const { data: insumos = [] } = useInsumos(restauranteId);
  const produzir = useProduzirPreparo();
  const [preparo, setPreparo] = useState("");
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");
  useEffect(() => {
    if (open) {
      setPreparo("");
      setQtd("");
      setObs("");
    }
  }, [open]);
  const preparos = insumos.filter((i) => i.is_preparo && i.ativo);

  const submit = () => {
    const q = parseNum(qtd);
    if (!preparo) return toast.error("Selecione o preparo");
    if (q === null || q <= 0) return toast.error("Informe a quantidade produzida");
    produzir.mutate(
      { restauranteId, preparoId: preparo, quantidade: q, observacao: obs.trim() || null },
      {
        onSuccess: () => {
          toast.success("Produção registrada");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar produção de preparo</DialogTitle></DialogHeader>
        {preparos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre um insumo marcado como "preparo intermediário" e monte sua ficha técnica.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Preparo</Label>
              <Select value={preparo} onValueChange={setPreparo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {preparos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.unidade})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Quantidade produzida</Label>
              <Input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Observação</Label>
              <Input maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Os insumos da ficha técnica serão descontados automaticamente.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={produzir.isPending || preparos.length === 0}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
