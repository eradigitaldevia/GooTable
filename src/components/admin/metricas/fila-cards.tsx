import { Inbox, ChefHat, CheckCircle2, Clock } from "lucide-react";

interface Props {
  fila: { recebido: number; em_preparo: number; pronto: number; mais_antigo_min: number };
}

export function FilaCards({ fila }: Props) {
  const cards = [
    { label: "Recebidos", value: fila.recebido, icon: Inbox, color: "text-chart-3" },
    { label: "Em preparo", value: fila.em_preparo, icon: ChefHat, color: "text-primary" },
    { label: "Prontos", value: fila.pronto, icon: CheckCircle2, color: "text-success" },
    {
      label: "Mais antigo",
      value: `${fila.mais_antigo_min} min`,
      icon: Clock,
      color: "text-chart-2",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{c.value}</div>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-accent ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}