import { useState } from "react";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRegistrarPagamento } from "@/hooks/use-pagamentos";
import type { PagamentoMetodo } from "@/lib/pagamentos.functions";
import { formatBRL } from "@/lib/cart";

export default function ConfirmarPagamentoDialogBody({
  onOpenChange,
  restauranteId,
  comandaId,
  saldoSugerido,
}: {
  onOpenChange: (v: boolean) => void;
  restauranteId: string;
  comandaId: string;
  saldoSugerido: number;
}) {
  const [metodo, setMetodo] = useState<PagamentoMetodo>("pix");
  const [valor, setValor] = useState<string>(
    saldoSugerido > 0 ? saldoSugerido.toFixed(2) : ""
  );
  const [observacao, setObservacao] = useState("");
  const registrar = useRegistrarPagamento(restauranteId);

  const submit = async () => {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    try {
      const res = await registrar.mutateAsync({
        comandaId,
        metodo,
        valor: v,
        observacao: observacao.trim() || undefined,
      });
      toast.success("Pagamento registrado");
      if (res?.aviso_teto_excedido) {
        toast.warning(
          "Atenção: o dinheiro acumulado no caixa ultrapassou o teto configurado. Considere fazer uma sangria.",
        );
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar pagamento");
    }
  };

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Confirmar pagamento</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="rounded-lg bg-muted p-3 text-sm">
          <span className="text-muted-foreground">Saldo restante: </span>
          <span className="font-semibold">{formatBRL(saldoSugerido)}</span>
        </div>
        <div className="space-y-1">
          <Label>Método</Label>
          <Select value={metodo} onValueChange={(v) => setMetodo(v as PagamentoMetodo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="fiado">Fiado</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
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
          />
        </div>
        <div className="space-y-1">
          <Label>Observação</Label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional"
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={submit} disabled={registrar.isPending}>
          {registrar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
