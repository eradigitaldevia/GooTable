import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCadastrosFinanceiro, useSalvarLancamento } from "@/hooks/use-financeiro";
import type { Lancamento } from "@/lib/financeiro.functions";
import { dataLocal } from "@/lib/data-fuso";
import { FormaPagamentoSelect } from "./forma-pagamento-select";

const NENHUM = "__nenhum";

export function NovoLancamentoDialog({
  restauranteId, open, onClose, editar, tipoPadrao,
}: {
  restauranteId: string; open: boolean; onClose: () => void;
  editar: Lancamento | null; tipoPadrao: "pagar" | "receber";
}) {
  const { data: cad } = useCadastrosFinanceiro(restauranteId);
  const salvar = useSalvarLancamento();
  const [tipo, setTipo] = useState<"pagar" | "receber">(tipoPadrao);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState(dataLocal());
  const [comp, setComp] = useState(dataLocal());
  const [categoriaId, setCategoriaId] = useState(NENHUM);
  const [fornecedorId, setFornecedorId] = useState(NENHUM);
  const [forma, setForma] = useState("pix");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!open) return;
    setTipo(editar?.tipo ?? tipoPadrao);
    setDescricao(editar?.descricao ?? "");
    setValor(editar ? String(editar.valor) : "");
    setVenc(editar?.data_vencimento ?? dataLocal());
    setComp(editar?.data_competencia ?? dataLocal());
    setCategoriaId(editar?.categoria_id ?? NENHUM);
    setFornecedorId(editar?.fornecedor_id ?? NENHUM);
    setForma(editar?.forma_pagamento ?? "pix");
    setObs(editar?.observacao ?? "");
  }, [open, editar, tipoPadrao]);

  const tipoCat = tipo === "pagar" ? "despesa" : "receita";
  const valorNum = Number(valor.replace(",", "."));

  const submit = () => {
    if (!descricao.trim() || !(valorNum > 0)) return toast.error("Informe descrição e valor válido");
    salvar.mutate(
      {
        restauranteId, id: editar?.id, tipo, descricao: descricao.trim(), valor: valorNum,
        categoriaId: categoriaId === NENHUM ? null : categoriaId,
        fornecedorId: fornecedorId === NENHUM ? null : fornecedorId,
        dataVencimento: venc, dataCompetencia: comp, formaPagamento: forma, observacao: obs.trim() || null,
      },
      { onSuccess: () => { toast.success("Lançamento salvo"); onClose(); }, onError: (e) => toast.error(e.message) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editar ? "Editar lançamento" : "Novo lançamento"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v as "pagar" | "receber"); setCategoriaId(NENHUM); }} disabled={!!editar}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pagar">Conta a pagar (despesa)</SelectItem>
                <SelectItem value="receber">Conta a receber (receita)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <FormaPagamentoSelect value={forma} onChange={setForma} />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Competência</Label>
            <Input type="date" value={comp} onChange={(e) => setComp(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Sem categoria</SelectItem>
                {cad?.categorias.filter((c) => c.tipo === tipoCat).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Nenhum</SelectItem>
                {cad?.fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Observação</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={salvar.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
