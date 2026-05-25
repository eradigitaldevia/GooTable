import { useState } from "react";
import { toast } from "sonner";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCriarCupom, useAtualizarCupom } from "@/hooks/use-cupons";
import type { Cupom, CupomInput } from "@/lib/cupons.functions";

function parseNum(v: string): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function toLocalDT(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function fromLocalDT(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

export default function CupomDialogBody({
  onClose,
  restauranteId,
  cupom,
}: {
  onClose: () => void;
  restauranteId: string | undefined;
  cupom: Cupom | null;
}) {
  const criar = useCriarCupom(restauranteId);
  const atualizar = useAtualizarCupom(restauranteId);

  const [codigo, setCodigo] = useState(cupom?.codigo ?? "");
  const [tipo, setTipo] = useState<"percentual" | "valor_fixo">(
    (cupom?.tipo as "percentual" | "valor_fixo") ?? "percentual",
  );
  const [valor, setValor] = useState(String(cupom?.valor ?? 0));
  const [ini, setIni] = useState(toLocalDT(cupom?.validade_inicio ?? null));
  const [fim, setFim] = useState(toLocalDT(cupom?.validade_fim ?? null));
  const [usoMax, setUsoMax] = useState(cupom?.uso_max != null ? String(cupom.uso_max) : "");
  const [valorMin, setValorMin] = useState(
    cupom?.regras_json?.valor_minimo != null ? String(cupom.regras_json.valor_minimo) : "",
  );
  const [primeira, setPrimeira] = useState(!!cupom?.regras_json?.primeira_compra);
  const [ativo, setAtivo] = useState(cupom?.ativo ?? true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = codigo.trim();
    if (!code) return toast.error("Informe um código");
    const v = parseNum(valor);
    if (v <= 0) return toast.error("Valor inválido");
    if (tipo === "percentual" && v > 100) return toast.error("Percentual deve ser ≤ 100");

    const input: CupomInput = {
      codigo: code,
      tipo,
      valor: v,
      validade_inicio: fromLocalDT(ini),
      validade_fim: fromLocalDT(fim),
      uso_max: usoMax ? Math.floor(parseNum(usoMax)) || null : null,
      valor_minimo: valorMin ? parseNum(valorMin) : null,
      primeira_compra: primeira,
      ativo,
    };

    const onErr = (err: unknown) =>
      toast.error((err as Error)?.message ?? "Falha ao salvar");
    if (cupom) {
      atualizar.mutate(
        { cupomId: cupom.id, input },
        {
          onSuccess: () => {
            toast.success("Cupom atualizado");
            onClose();
          },
          onError: onErr,
        },
      );
    } else {
      criar.mutate(input, {
        onSuccess: () => {
          toast.success("Cupom criado");
          onClose();
        },
        onError: onErr,
      });
    }
  };

  const pending = criar.isPending || atualizar.isPending;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{cupom ? "Editar cupom" : "Novo cupom"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="EX: BEMVINDO10"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "percentual" | "valor_fixo")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual (%)</SelectItem>
                <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="valor">Valor</Label>
            <Input id="valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="usomax">Uso máximo (opcional)</Label>
            <Input id="usomax" inputMode="numeric" value={usoMax} onChange={(e) => setUsoMax(e.target.value)} placeholder="Sem limite" />
          </div>
          <div>
            <Label htmlFor="ini">Início (opcional)</Label>
            <Input id="ini" type="datetime-local" value={ini} onChange={(e) => setIni(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fim">Fim (opcional)</Label>
            <Input id="fim" type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="vmin">Valor mínimo (R$)</Label>
            <Input id="vmin" inputMode="decimal" value={valorMin} onChange={(e) => setValorMin(e.target.value)} placeholder="0" />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <div className="text-sm font-medium">Somente 1ª compra</div>
              <p className="text-xs text-muted-foreground">Cliente sem pedidos anteriores.</p>
            </div>
            <Switch checked={primeira} onCheckedChange={setPrimeira} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div className="font-medium">Ativo</div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
