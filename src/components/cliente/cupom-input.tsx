import { useState } from "react";
import { toast } from "sonner";
import { Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAplicarCupomComanda,
  useRemoverCupomComanda,
} from "@/hooks/use-cupons";

export function CupomInput({
  qrToken,
  comandaId,
  clienteId,
  cupomCodigo,
}: {
  qrToken: string;
  comandaId: string;
  clienteId?: string | null;
  cupomCodigo: string | null;
}) {
  const [codigo, setCodigo] = useState("");
  const aplicar = useAplicarCupomComanda(qrToken);
  const remover = useRemoverCupomComanda(qrToken);

  const onAplicar = () => {
    const c = codigo.trim();
    if (!c) return;
    aplicar.mutate(
      { comandaId, codigo: c, clienteId },
      {
        onSuccess: (res) => {
          if (res?.valido) {
            toast.success("Cupom aplicado");
            setCodigo("");
          } else {
            toast.error(res?.motivo ?? "Cupom inválido");
          }
        },
        onError: (err: unknown) => toast.error((err as Error)?.message ?? "Falha"),
      },
    );
  };

  const onRemover = () => {
    remover.mutate(comandaId, {
      onSuccess: () => toast.success("Cupom removido"),
      onError: (err: unknown) => toast.error((err as Error)?.message ?? "Falha"),
    });
  };

  if (cupomCodigo) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm">
          <Ticket className="h-4 w-4 text-primary" />
          <span>
            Cupom <span className="font-mono font-semibold">{cupomCodigo}</span> aplicado
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemover} disabled={remover.isPending}>
          <X className="h-4 w-4" /> Remover
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Código do cupom"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        className="font-mono"
      />
      <Button onClick={onAplicar} disabled={aplicar.isPending || !codigo.trim()}>
        Aplicar
      </Button>
    </div>
  );
}
