import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInsumos, useRegistrarMovimento } from "@/hooks/use-estoque";
import { useCadastrosFinanceiro } from "@/hooks/use-financeiro";
import { dataLocal } from "@/lib/data-fuso";
import { parseNum } from "./estoque-format";

type Tipo = "entrada" | "perda" | "ajuste";
const INICIAL = { insumo: "", tipo: "entrada" as Tipo, qtd: "", custo: "", forn: "", obs: "", conta: false, venc: "" };

export function MovimentoDialog({ restauranteId, open, onClose }: { restauranteId: string; open: boolean; onClose: () => void }) {
  const { data: insumos = [] } = useInsumos(restauranteId);
  const { data: cad } = useCadastrosFinanceiro(restauranteId);
  const registrar = useRegistrarMovimento();
  const [f, setF] = useState(INICIAL);
  useEffect(() => {
    if (open) setF({ ...INICIAL, venc: dataLocal() });
  }, [open]);

  const submit = () => {
    const qtd = parseNum(f.qtd);
    const custo = parseNum(f.custo);
    if (!f.insumo) return toast.error("Selecione o insumo");
    if (qtd === null || qtd === 0) return toast.error("Informe a quantidade");
    if (f.tipo !== "ajuste" && qtd < 0) return toast.error("Quantidade deve ser positiva");
    if (custo !== null && custo < 0) return toast.error("Custo inválido");
    if (f.conta && !(custo && custo > 0)) return toast.error("Informe o custo para gerar a conta a pagar");
    registrar.mutate(
      {
        restauranteId,
        insumoId: f.insumo,
        tipo: f.tipo,
        quantidade: qtd,
        custoUnit: f.tipo === "entrada" ? custo : null,
        fornecedorId: f.tipo === "entrada" && f.forn ? f.forn : null,
        observacao: f.obs.trim() || null,
        gerarConta: f.tipo === "entrada" && f.conta,
        vencimento: f.conta ? f.venc || null : null,
      },
      {
        onSuccess: () => {
          toast.success("Movimentação registrada");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova movimentação</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Tipo, ...(v !== "entrada" ? { conta: false } : {}) })}>

                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (compra)</SelectItem>
                  <SelectItem value="perda">Perda / quebra</SelectItem>
                  <SelectItem value="ajuste">Ajuste (+/−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Insumo</Label>
              <Select value={f.insumo} onValueChange={(v) => setF({ ...f, insumo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {insumos.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome} ({i.unidade})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Quantidade{f.tipo === "ajuste" ? " (use − para reduzir)" : ""}</Label>
              <Input inputMode="decimal" value={f.qtd} onChange={(e) => setF({ ...f, qtd: e.target.value })} />
            </div>
            {f.tipo === "entrada" && (
              <div className="grid gap-1.5">
                <Label>Custo por unidade (R$)</Label>
                <Input inputMode="decimal" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} />
              </div>
            )}
          </div>
          {f.tipo === "entrada" && (
            <>
              <div className="grid gap-1.5">
                <Label>Fornecedor (opcional)</Label>
                <Select value={f.forn || "none"} onValueChange={(v) => setF({ ...f, forn: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(cad?.fornecedores ?? []).map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-medium">Gerar conta a pagar no Financeiro</div>
                <Switch checked={f.conta} onCheckedChange={(v) => setF({ ...f, conta: v })} aria-label="Gerar conta a pagar" />
              </div>
              {f.conta && (
                <div className="grid gap-1.5">
                  <Label>Vencimento</Label>
                  <Input type="date" value={f.venc} onChange={(e) => setF({ ...f, venc: e.target.value })} />
                </div>
              )}
            </>
          )}
          <div className="grid gap-1.5">
            <Label>Observação</Label>
            <Input maxLength={300} value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={registrar.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
