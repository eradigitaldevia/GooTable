import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import {
  useProgramaFidelidade,
  useSalvarProgramaFidelidade,
} from "@/hooks/use-fidelidade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/fidelidade")({
  component: FidelidadeAdmin,
});

function parseNum(v: string): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function FidelidadeAdmin() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: programa, isLoading } = useProgramaFidelidade(restaurante?.id);
  const salvar = useSalvarProgramaFidelidade(restaurante?.id);

  const [ativo, setAtivo] = useState(false);
  const [percentualCashback, setPercentualCashback] = useState("0");
  const [percentualMaxResgate, setPercentualMaxResgate] = useState("100");
  const [validadeDias, setValidadeDias] = useState("0");
  const [valorMinimoPedido, setValorMinimoPedido] = useState("0");

  useEffect(() => {
    if (programa) {
      setAtivo(programa.ativo);
      setPercentualCashback(String(programa.percentual_cashback));
      setPercentualMaxResgate(String(programa.percentual_max_resgate));
      setValidadeDias(String(programa.validade_dias));
      setValorMinimoPedido(String(programa.valor_minimo_pedido));
    }
  }, [programa]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pc = parseNum(percentualCashback);
    const pmr = parseNum(percentualMaxResgate);
    const vd = Math.floor(parseNum(validadeDias));
    const vm = parseNum(valorMinimoPedido);

    if (pc < 0 || pc > 100) return toast.error("Cashback deve estar entre 0 e 100%");
    if (pmr < 0 || pmr > 100) return toast.error("Limite de resgate deve estar entre 0 e 100%");
    if (vd < 0) return toast.error("Validade inválida");
    if (vm < 0) return toast.error("Valor mínimo inválido");

    salvar.mutate(
      {
        ativo,
        percentual_cashback: pc,
        percentual_max_resgate: pmr,
        validade_dias: vd,
        valor_minimo_pedido: vm,
      },
      {
        onSuccess: () => toast.success("Programa salvo"),
        onError: (err: any) => toast.error(err?.message ?? "Falha ao salvar"),
      },
    );
  };

  if (isLoading || !restaurante) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Programa de Fidelidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure o cashback que cada cliente recebe e como pode ser resgatado.
        </p>
      </header>

      <form onSubmit={submit} className="max-w-2xl space-y-6 rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-4">
          <div>
            <div className="font-medium">Programa ativo</div>
            <p className="text-sm text-muted-foreground">
              Quando inativo, novos pedidos não geram cashback.
            </p>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pc">Cashback (%)</Label>
            <Input
              id="pc"
              inputMode="decimal"
              value={percentualCashback}
              onChange={(e) => setPercentualCashback(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Percentual creditado sobre o subtotal de cada cliente.
            </p>
          </div>
          <div>
            <Label htmlFor="pmr">Limite de resgate por comanda (%)</Label>
            <Input
              id="pmr"
              inputMode="decimal"
              value={percentualMaxResgate}
              onChange={(e) => setPercentualMaxResgate(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Máximo do subtotal individual que pode ser pago com cashback.
            </p>
          </div>
          <div>
            <Label htmlFor="vd">Validade do cashback (dias)</Label>
            <Input
              id="vd"
              inputMode="numeric"
              value={validadeDias}
              onChange={(e) => setValidadeDias(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              0 = sem expiração.
            </p>
          </div>
          <div>
            <Label htmlFor="vm">Valor mínimo de pedido (R$)</Label>
            <Input
              id="vm"
              inputMode="decimal"
              value={valorMinimoPedido}
              onChange={(e) => setValorMinimoPedido(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Pedidos abaixo deste valor não geram cashback.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
