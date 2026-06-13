import { Check, CookingPot, Package, Bike, Store, X } from "lucide-react";
import type { RastreioPedido } from "@/lib/delivery.functions";

type Status = RastreioPedido["status"];

interface Etapa {
  key: Status | "saiu" | "pronto_retirada";
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function etapas(modo: "delivery" | "retirada"): Etapa[] {
  if (modo === "delivery") {
    return [
      { key: "recebido", label: "Pedido recebido", Icon: Check },
      { key: "em_preparo", label: "Em preparo", Icon: CookingPot },
      { key: "pronto", label: "Saiu para entrega", Icon: Bike },
      { key: "entregue", label: "Entregue", Icon: Package },
    ];
  }
  return [
    { key: "recebido", label: "Pedido recebido", Icon: Check },
    { key: "em_preparo", label: "Em preparo", Icon: CookingPot },
    { key: "pronto", label: "Pronto para retirada", Icon: Store },
    { key: "entregue", label: "Retirado", Icon: Package },
  ];
}

const ORDEM: Status[] = ["recebido", "em_preparo", "pronto", "entregue"];

export function RastreioTimeline({
  status,
  modo,
}: {
  status: Status;
  modo: "delivery" | "retirada";
}) {
  if (status === "cancelado") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <X className="h-5 w-5" />
        <div>
          <p className="font-semibold">Pedido cancelado</p>
          <p className="text-sm opacity-80">
            Entre em contato com o restaurante para mais informações.
          </p>
        </div>
      </div>
    );
  }
  const idxAtual = ORDEM.indexOf(status);
  const lista = etapas(modo);
  return (
    <ol className="space-y-3">
      {lista.map((et, i) => {
        const done = i <= idxAtual;
        const active = i === idxAtual;
        return (
          <li key={et.key} className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted bg-card text-muted-foreground"
              }`}
            >
              <et.Icon className="h-4 w-4" />
            </div>
            <div className="pt-1">
              <p
                className={`text-sm font-semibold ${
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {et.label}
              </p>
              {active && (
                <p className="text-xs text-muted-foreground">Em andamento…</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}