import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalvarFicha } from "@/hooks/use-estoque";
import type { FichaItem, Insumo } from "@/lib/estoque.functions";
import { parseNum } from "./estoque-format";

export interface AlvoFicha {
  tipo: "produto" | "preparo";
  id: string;
  nome: string;
}

export function FichaDialog({
  restauranteId,
  alvo,
  insumos,
  fichas,
  onClose,
}: {
  restauranteId: string;
  alvo: AlvoFicha | null;
  insumos: Insumo[];
  fichas: FichaItem[];
  onClose: () => void;
}) {
  const salvar = useSalvarFicha();
  const [linhas, setLinhas] = useState<{ insumo_id: string; qtd: string }[]>([]);

  useEffect(() => {
    if (!alvo) return;
    const col = alvo.tipo === "produto" ? "produto_id" : "preparo_id";
    setLinhas(fichas.filter((f) => f[col] === alvo.id).map((f) => ({ insumo_id: f.insumo_id, qtd: String(f.quantidade) })));
  }, [alvo, fichas]);

  const opcoes = insumos.filter((i) => i.ativo && !(alvo?.tipo === "preparo" && i.id === alvo.id));
  const unidade = (id: string) => insumos.find((i) => i.id === id)?.unidade ?? "";

  const submit = () => {
    if (!alvo) return;
    const itens = [];
    for (const l of linhas) {
      const q = parseNum(l.qtd);
      if (!l.insumo_id || q === null || q <= 0) return toast.error("Preencha insumo e quantidade válidos em todas as linhas");
      itens.push({ insumo_id: l.insumo_id, quantidade: q });
    }
    salvar.mutate(
      { restauranteId, alvo: alvo.tipo, alvoId: alvo.id, itens },
      {
        onSuccess: () => {
          toast.success("Ficha técnica salva");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={!!alvo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ficha técnica — {alvo?.nome}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Quantidade de cada insumo usada para {alvo?.tipo === "preparo" ? "produzir 1 unidade do preparo" : "1 unidade do produto"}.
        </p>
        <div className="space-y-2">
          {linhas.map((l, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select
                value={l.insumo_id}
                onValueChange={(v) => setLinhas(linhas.map((x, i) => (i === idx ? { ...x, insumo_id: v } : x)))}
              >
                <SelectTrigger className="flex-1"><SelectValue placeholder="Insumo" /></SelectTrigger>
                <SelectContent>
                  {opcoes.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="w-24"
                inputMode="decimal"
                placeholder="Qtd"
                value={l.qtd}
                onChange={(e) => setLinhas(linhas.map((x, i) => (i === idx ? { ...x, qtd: e.target.value } : x)))}
              />
              <span className="w-8 text-xs text-muted-foreground">{unidade(l.insumo_id)}</span>
              <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => setLinhas(linhas.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setLinhas([...linhas, { insumo_id: "", qtd: "" }])}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar insumo
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={salvar.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
