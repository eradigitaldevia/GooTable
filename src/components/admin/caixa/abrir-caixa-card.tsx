import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { useAbrirCaixa, useHistoricoTurnos } from "@/hooks/use-caixa";

export function AbrirCaixaCard({
  restauranteId,
  operadorPadrao,
  bloquearOperador = false,
}: {
  restauranteId: string;
  operadorPadrao?: string;
  bloquearOperador?: boolean;
}) {
  const { data: hist } = useHistoricoTurnos(restauranteId);
  const ultimo = hist?.find((t) => t.status === "fechado");
  const sugestaoFundo = Number(ultimo?.fundo_final ?? 150);

  const [operador, setOperador] = useState(operadorPadrao ?? "");
  const [fundo, setFundo] = useState<string>(sugestaoFundo.toFixed(2));
  const abrir = useAbrirCaixa(restauranteId);

  useEffect(() => {
    if (operadorPadrao && !operador) setOperador(operadorPadrao);
  }, [operadorPadrao, operador]);

  const submit = async () => {
    const v = Number(fundo.replace(",", "."));
    if (!operador.trim()) {
      toast.error("Informe o nome do operador");
      return;
    }
    if (!Number.isFinite(v) || v < 0) {
      toast.error("Fundo inicial inválido");
      return;
    }
    try {
      await abrir.mutateAsync({ operadorNome: operador.trim(), fundoInicial: v });
      toast.success("Caixa aberto");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir caixa");
    }
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">Abrir novo turno</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Nenhum caixa aberto. Informe o operador e o fundo inicial para começar.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Operador</Label>
          <Input
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            placeholder="Nome do operador"
            disabled={bloquearOperador && !!operadorPadrao}
            readOnly={bloquearOperador && !!operadorPadrao}
          />
        </div>
        <div className="space-y-1">
          <Label>Fundo inicial (R$)</Label>
          <Input
            inputMode="decimal"
            value={fundo}
            onChange={(e) => setFundo(e.target.value)}
            placeholder="150,00"
          />
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={submit} disabled={abrir.isPending}>
        {abrir.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LockOpen className="mr-2 h-4 w-4" />
        )}
        Abrir caixa
      </Button>
    </Card>
  );
}