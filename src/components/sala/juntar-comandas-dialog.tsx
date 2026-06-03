import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Merge } from "lucide-react";
import { toast } from "sonner";
import { useJuntarComandasMesa } from "@/hooks/use-comandas-acoes";
import { formatBRL } from "@/lib/cart";
import type { ResumoMesaComanda } from "@/lib/pedidos.functions";

export function JuntarComandasDialog({
  open,
  onOpenChange,
  restauranteId,
  mesaId,
  sessaoId,
  comandas,
  onJuntado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restauranteId: string;
  mesaId: string;
  sessaoId: string;
  comandas: ResumoMesaComanda[];
  onJuntado?: (comandaDestinoId: string) => void;
}) {
  const [sel, setSel] = useState<Set<string>>(
    () => new Set(comandas.map((c) => c.id)),
  );
  const [titularOpcao, setTitularOpcao] = useState<string>("compartilhada");
  const juntar = useJuntarComandasMesa(restauranteId, mesaId);

  const titulares = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of comandas) {
      if (c.titular_cliente_id) {
        map.set(c.titular_cliente_id, c.titular_nome ?? "Cliente");
      }
      for (const p of c.participantes) {
        if (p.cliente_id && p.nome) map.set(p.cliente_id, p.nome);
      }
    }
    return Array.from(map.entries());
  }, [comandas]);

  const toggle = (id: string) => {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selecionadas = comandas.filter((c) => sel.has(c.id));
  const totalConsolidado = selecionadas.reduce((acc, c) => acc + c.total, 0);

  const submit = async () => {
    if (sel.size < 2) {
      toast.error("Selecione ao menos 2 comandas");
      return;
    }
    try {
      const res = await juntar.mutateAsync({
        sessaoId,
        comandaIds: Array.from(sel),
        titularClienteId:
          titularOpcao === "compartilhada" ? null : titularOpcao,
      });
      toast.success("Comandas juntadas");
      onJuntado?.(res.comandaDestinoId);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao juntar comandas");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-4 w-4" /> Juntar comandas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Comandas
            </p>
            <ul className="space-y-2">
              {comandas.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background p-2"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={sel.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                      id={`j-${c.id}`}
                    />
                    <Label htmlFor={`j-${c.id}`} className="text-sm">
                      <span className="font-medium">
                        {c.titular_nome ??
                          (c.participantes[0]?.nome
                            ? `Compartilhada (${c.participantes.map((p) => p.nome).join(", ")})`
                            : "Sem titular")}
                      </span>
                    </Label>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatBRL(c.total)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right text-sm">
              Total: <strong>{formatBRL(totalConsolidado)}</strong>
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Titular da comanda resultante
            </p>
            <RadioGroup value={titularOpcao} onValueChange={setTitularOpcao}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="compartilhada" id="tit-shared" />
                <Label htmlFor="tit-shared" className="text-sm">
                  Sem titular (compartilhada)
                </Label>
              </div>
              {titulares.map(([id, nome]) => (
                <div key={id} className="flex items-center gap-2">
                  <RadioGroupItem value={id} id={`tit-${id}`} />
                  <Label htmlFor={`tit-${id}`} className="text-sm">
                    {nome}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={juntar.isPending || sel.size < 2}>
            {juntar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Juntar {sel.size > 0 ? `(${sel.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}