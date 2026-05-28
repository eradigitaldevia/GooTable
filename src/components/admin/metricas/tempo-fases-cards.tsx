interface Props {
  tempos: {
    recebidoParaPreparoMin: number;
    preparoParaProntoMin: number;
    prontoParaEntregueMin: number;
    cicloTotalMin: number;
  };
}

function fmt(v: number) {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
}

export function TempoFasesCards({ tempos }: Props) {
  const cards = [
    { label: "Recebido → Preparo", value: tempos.recebidoParaPreparoMin },
    { label: "Preparo → Pronto", value: tempos.preparoParaProntoMin },
    { label: "Pronto → Entregue", value: tempos.prontoParaEntregueMin },
    { label: "Ciclo total", value: tempos.cicloTotalMin },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-sm text-muted-foreground">{c.label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{fmt(c.value)}</div>
        </div>
      ))}
    </div>
  );
}