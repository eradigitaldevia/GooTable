import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cart";
import { useFecharCaixa, useTotaisTurno } from "@/hooks/use-caixa";
import type { TurnoCaixa } from "@/lib/caixa.functions";

function formatHora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function TurnoAbertoPainel({
  restauranteId,
  turno,
}: {
  restauranteId: string;
  turno: TurnoCaixa;
}) {
  const { data: totais } = useTotaisTurno(restauranteId, turno.id);
  const fechar = useFecharCaixa(restauranteId);

  const [contagem, setContagem] = useState("");
  const [fundoProx, setFundoProx] = useState(Number(turno.fundo_inicial).toFixed(2));
  const [obs, setObs] = useState("");

  const diferenca = useMemo(() => {
    const v = Number(contagem.replace(",", "."));
    if (!Number.isFinite(v) || !totais) return null;
    return v - totais.saldo_esperado;
  }, [contagem, totais]);

  const submit = async () => {
    const cf = Number(contagem.replace(",", "."));
    const ff = Number(fundoProx.replace(",", "."));
    if (!Number.isFinite(cf) || cf < 0) {
      toast.error("Informe a contagem física");
      return;
    }
    if (!Number.isFinite(ff) || ff < 0) {
      toast.error("Fundo de troco inválido");
      return;
    }
    try {
      await fechar.mutateAsync({
        turnoId: turno.id,
        contagemFisica: cf,
        fundoFinal: ff,
        obsFechamento: obs.trim() || undefined,
      });
      toast.success("Caixa fechado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao fechar caixa");
    }
  };

  const metric = (label: string, value: string, sub?: string, tone?: "pos" | "neg") => (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${
          tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
        Caixa aberto · Iniciado às <strong>{formatHora(turno.aberto_em)}</strong> · Operador:{" "}
        <strong>{turno.operador_nome}</strong>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metric("Fundo inicial", formatBRL(Number(turno.fundo_inicial)), "Informado na abertura")}
        {metric(
          "Vendas no turno",
          formatBRL(totais?.total_vendas ?? 0),
          `${totais?.qtd_pedidos ?? 0} comandas`,
          "pos",
        )}
        {metric(
          "Sangrias",
          `− ${formatBRL(totais?.total_sangrias ?? 0)}`,
          totais?.total_suprimentos
            ? `+ ${formatBRL(totais.total_suprimentos)} em suprimentos`
            : "Nenhum suprimento",
          "neg",
        )}
        {metric("Saldo esperado", formatBRL(totais?.saldo_esperado ?? 0), "Dinheiro em caixa")}
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Vendas por forma de pagamento</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Apenas pagamentos confirmados no intervalo do turno. PIX, cartão e fiado não entram no saldo de gaveta.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Linha label="Dinheiro" valor={totais?.total_dinheiro ?? 0} />
          <Linha label="Cartão" valor={totais?.total_cartao ?? 0} />
          <Linha label="PIX" valor={totais?.total_pix ?? 0} />
          <Linha label="Fiado" valor={totais?.total_fiado ?? 0} />
          <Linha label="Outro" valor={totais?.total_outro ?? 0} />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Fechar caixa</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Dinheiro contado fisicamente (R$)</Label>
            <Input
              inputMode="decimal"
              value={contagem}
              onChange={(e) => setContagem(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1">
            <Label>Fundo de troco para próximo turno (R$)</Label>
            <Input
              inputMode="decimal"
              value={fundoProx}
              onChange={(e) => setFundoProx(e.target.value)}
              placeholder="150,00"
            />
          </div>
        </div>

        {diferenca !== null && totais && (
          <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Esperado em caixa</span>
              <span className="font-medium">{formatBRL(totais.saldo_esperado)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Contagem física</span>
              <span className="font-medium">{formatBRL(Number(contagem.replace(",", ".")))}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Diferença</span>
              <span
                className={
                  diferenca > 0
                    ? "text-emerald-600"
                    : diferenca < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                }
              >
                {diferenca > 0 ? "+ " : diferenca < 0 ? "− " : ""}
                {formatBRL(Math.abs(diferenca))}
                {diferenca !== 0 && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({diferenca > 0 ? "sobra" : "falta"})
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-1">
          <Label>Observações do fechamento</Label>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Opcional"
            rows={2}
          />
        </div>

        <Button
          variant="destructive"
          className="mt-4 w-full"
          onClick={submit}
          disabled={fechar.isPending}
        >
          {fechar.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lock className="mr-2 h-4 w-4" />
          )}
          Fechar caixa e gerar relatório
        </Button>
      </Card>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatBRL(valor)}</span>
    </div>
  );
}