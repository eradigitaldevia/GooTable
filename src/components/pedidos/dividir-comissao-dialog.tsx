import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useGarcons } from "@/hooks/use-garcons";
import {
  useDefinirGarconsPedido,
  usePedidoGarcons,
} from "@/hooks/use-pedido-garcons";

interface Linha {
  garcom_id: string;
  peso: number;
}

export function DividirComissaoDialog({
  open,
  onOpenChange,
  restauranteId,
  pedidoId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restauranteId: string;
  pedidoId: string;
}) {
  const { data: garcons = [] } = useGarcons(restauranteId, false);
  const { data: atuais = [] } = usePedidoGarcons(
    open ? restauranteId : undefined,
    open ? pedidoId : undefined,
  );
  const definir = useDefinirGarconsPedido(restauranteId);

  const [linhas, setLinhas] = useState<Linha[]>([]);

  useEffect(() => {
    if (!open) return;
    if (atuais.length > 0) {
      setLinhas(atuais.map((a) => ({ garcom_id: a.garcom_id, peso: a.peso })));
    } else {
      setLinhas([]);
    }
  }, [open, atuais]);

  const ativos = useMemo(() => garcons.filter((g) => g.ativo), [garcons]);

  const soma = linhas.reduce((s, l) => s + (Number(l.peso) || 0), 0);
  const somaOk = Math.round(soma * 100) / 100 === 100;

  const toggleGarcom = (garcomId: string, checked: boolean) => {
    setLinhas((prev) => {
      if (checked) {
        if (prev.some((l) => l.garcom_id === garcomId)) return prev;
        return [...prev, { garcom_id: garcomId, peso: 0 }];
      }
      return prev.filter((l) => l.garcom_id !== garcomId);
    });
  };

  const setPeso = (garcomId: string, peso: number) => {
    setLinhas((prev) =>
      prev.map((l) => (l.garcom_id === garcomId ? { ...l, peso } : l)),
    );
  };

  const distribuirIgual = () => {
    if (linhas.length === 0) return;
    const base = Math.floor((100 / linhas.length) * 100) / 100;
    const resto = Math.round((100 - base * linhas.length) * 100) / 100;
    setLinhas((prev) =>
      prev.map((l, i) => ({
        ...l,
        peso: i === 0 ? Math.round((base + resto) * 100) / 100 : base,
      })),
    );
  };

  const handleSalvar = async () => {
    if (!somaOk) {
      toast.error(`Soma dos pesos deve ser 100 (atual: ${soma.toFixed(2)})`);
      return;
    }
    if (linhas.some((l) => l.peso <= 0)) {
      toast.error("Cada garçom deve ter peso maior que zero");
      return;
    }
    try {
      await definir.mutateAsync({ pedidoId, itens: linhas });
      toast.success("Divisão atualizada");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dividir comissão</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Selecione os garçons e ajuste o peso (%). A soma deve ser 100.
        </p>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {ativos.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum garçom ativo cadastrado.
            </p>
          )}
          {ativos.map((g) => {
            const linha = linhas.find((l) => l.garcom_id === g.id);
            const selecionado = !!linha;
            return (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                <Checkbox
                  checked={selecionado}
                  onCheckedChange={(v) => toggleGarcom(g.id, !!v)}
                />
                <span className="flex-1 text-sm">{g.nome}</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!selecionado}
                  value={linha?.peso ?? 0}
                  onChange={(e) =>
                    setPeso(g.id, Number(e.target.value) || 0)
                  }
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={distribuirIgual}
            disabled={linhas.length === 0}
          >
            Distribuir igualmente
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Soma:</span>
            <Badge variant={somaOk ? "secondary" : "outline"}>
              {soma.toFixed(2)}%
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={!somaOk || linhas.length === 0 || definir.isPending}
          >
            Salvar divisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}