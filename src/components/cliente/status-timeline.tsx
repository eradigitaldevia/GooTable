import { Check, Clock, ChefHat, Bell, PackageCheck } from "lucide-react";

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

const passos: { key: StatusPedido; label: string; icon: any }[] = [
  { key: "recebido", label: "Recebido", icon: Clock },
  { key: "em_preparo", label: "Em preparo", icon: ChefHat },
  { key: "pronto", label: "Pronto", icon: Bell },
  { key: "entregue", label: "Entregue", icon: PackageCheck },
];

export function StatusTimeline({ status }: { status: StatusPedido }) {
  const idxAtual = passos.findIndex((p) => p.key === status);
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="space-y-4">
        {passos.map((p, i) => {
          const Icon = p.icon;
          const concluido = i <= idxAtual;
          const atual = i === idxAtual;
          return (
            <div key={p.key} className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  concluido ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                } ${atual ? "ring-4 ring-primary/20" : ""}`}
              >
                {concluido && i < idxAtual ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className={`font-semibold ${concluido ? "text-foreground" : "text-muted-foreground"}`}>
                {p.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
