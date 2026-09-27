import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalvarInsumo } from "@/hooks/use-estoque";
import { UNIDADES, type Insumo, type UnidadeInsumo } from "@/lib/estoque.functions";
import { parseNum } from "./estoque-format";

const VAZIO = { nome: "", unidade: "un" as UnidadeInsumo, custo: "", minimo: "", bloquear: false, preparo: false, ativo: true };

export function InsumoDialog({
  restauranteId,
  open,
  insumo,
  onClose,
}: {
  restauranteId: string;
  open: boolean;
  insumo: Insumo | null;
  onClose: () => void;
}) {
  const salvar = useSalvarInsumo();
  const [f, setF] = useState(VAZIO);
  useEffect(() => {
    if (!open) return;
    setF(
      insumo
        ? {
            nome: insumo.nome,
            unidade: insumo.unidade,
            custo: String(insumo.custo_medio),
            minimo: String(insumo.estoque_minimo),
            bloquear: insumo.bloquear_ao_zerar,
            preparo: insumo.is_preparo,
            ativo: insumo.ativo,
          }
        : VAZIO,
    );
  }, [open, insumo]);

  const podeEditarCusto = !insumo || insumo.saldo <= 0;

  const submit = () => {
    const custo = parseNum(f.custo) ?? 0;
    const minimo = parseNum(f.minimo) ?? 0;
    if (!f.nome.trim()) return toast.error("Informe o nome");
    if (custo < 0 || minimo < 0) return toast.error("Valores não podem ser negativos");
    salvar.mutate(
      {
        restauranteId,
        id: insumo?.id,
        nome: f.nome.trim(),
        unidade: f.unidade,
        custo_medio: custo,
        estoque_minimo: minimo,
        bloquear_ao_zerar: f.bloquear,
        is_preparo: f.preparo,
        ativo: f.ativo,
      },
      {
        onSuccess: () => {
          toast.success("Insumo salvo");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{insumo ? "Editar insumo" : "Novo insumo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nome</Label>
            <Input value={f.nome} maxLength={80} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Unidade</Label>
              <Select value={f.unidade} onValueChange={(v) => setF({ ...f, unidade: v as UnidadeInsumo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Custo por unidade (R$)</Label>
              <Input inputMode="decimal" value={f.custo} disabled={!podeEditarCusto} onChange={(e) => setF({ ...f, custo: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Estoque mínimo</Label>
              <Input inputMode="decimal" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} />
            </div>
          </div>
          {!podeEditarCusto && (
            <p className="text-xs text-muted-foreground">O custo médio é atualizado automaticamente pelas entradas.</p>
          )}
          {[
            ["bloquear", "Bloquear venda quando acabar", "Se desligado, apenas alerta e o saldo pode ficar negativo."],
            ["preparo", "É um preparo intermediário", "Ex.: molho da casa — produzido a partir de outros insumos."],
            ["ativo", "Ativo", "Insumos inativos não são descontados nas vendas."],
          ].map(([k, t, d]) => (
            <div key={k} className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{t}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </div>
              <Switch
                checked={f[k as "bloquear" | "preparo" | "ativo"]}
                onCheckedChange={(v) => setF({ ...f, [k]: v })}
                aria-label={t}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={salvar.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
