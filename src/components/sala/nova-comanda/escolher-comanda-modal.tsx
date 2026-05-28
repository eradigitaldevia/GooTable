import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComandaAbertaInfo } from "@/lib/pedidos.functions";

export function EscolherComandaModal({
  comandas,
  onSelecionar,
  onNovaIndividual,
  onClose,
}: {
  comandas: ComandaAbertaInfo[];
  onSelecionar: (comandaId: string) => void;
  onNovaIndividual: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Escolher comanda</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta mesa tem mais de uma comanda aberta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {comandas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelecionar(c.id)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left hover:bg-muted"
            >
              <span className="font-medium">
                {c.tipo === "compartilhada"
                  ? "Compartilhada"
                  : c.titular_nome ?? "Individual"}
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {c.tipo}
              </span>
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-4 h-12 w-full rounded-2xl"
          onClick={onNovaIndividual}
        >
          + Nova comanda individual
        </Button>
      </div>
    </div>
  );
}