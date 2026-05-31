import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cart";
import {
  useMovimentosTurno,
  useRegistrarMovimentoCaixa,
} from "@/hooks/use-caixa";
import type { TurnoCaixa } from "@/lib/caixa.functions";

const LABEL: Record<string, string> = {
  abertura: "Abertura",
  sangria: "Sangria",
  suprimento: "Suprimento",
  fechamento: "Fechamento",
};

function hora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function MovimentosPanel({
  restauranteId,
  turno,
}: {
  restauranteId: string;
  turno: TurnoCaixa | null;
}) {
  const { data: movimentos } = useMovimentosTurno(restauranteId, turno?.id);
  const registrar = useRegistrarMovimentoCaixa(restauranteId);

  const [tipo, setTipo] = useState<"sangria" | "suprimento">("sangria");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");

  const submit = async () => {
    if (!turno) return;
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Valor inválido");
      return;
    }
    try {
      await registrar.mutateAsync({
        turnoId: turno.id,
        tipo,
        valor: v,
        motivo: motivo.trim() || undefined,
      });
      setValor("");
      setMotivo("");
      toast.success("Movimentação registrada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    }
  };

  return (
    <div className="space-y-4">
      {!turno && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Abra um turno para registrar sangrias ou suprimentos.
        </div>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Registrar movimentação</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as "sangria" | "suprimento")}
              disabled={!turno}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sangria">Sangria (retirada)</SelectItem>
                <SelectItem value="suprimento">Suprimento (entrada)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              disabled={!turno}
            />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <Label>Motivo</Label>
          <Input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: Pagamento fornecedor, troco, reforço…"
            disabled={!turno}
          />
        </div>
        <Button
          className="mt-4"
          onClick={submit}
          disabled={!turno || registrar.isPending}
        >
          {registrar.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Registrar
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Histórico do turno</h3>
        <div className="mt-2 divide-y divide-border">
          {(movimentos ?? []).length === 0 && (
            <div className="py-3 text-sm text-muted-foreground">Nenhuma movimentação.</div>
          )}
          {(movimentos ?? []).map((m) => {
            const positivo = m.tipo === "abertura" || m.tipo === "suprimento";
            return (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{LABEL[m.tipo] ?? m.tipo}</div>
                  {m.motivo && (
                    <div className="text-xs text-muted-foreground">{m.motivo}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{hora(m.criado_em)}</span>
                  <span
                    className={`font-medium ${
                      m.tipo === "sangria"
                        ? "text-destructive"
                        : positivo
                          ? "text-emerald-600"
                          : ""
                    }`}
                  >
                    {m.tipo === "sangria" ? "− " : positivo ? "+ " : ""}
                    {formatBRL(Number(m.valor))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}