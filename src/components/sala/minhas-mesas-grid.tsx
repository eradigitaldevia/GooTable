import type { SalaMesa } from "@/lib/sala.functions";

export function MinhasMesasGrid({
  mesas,
  prontosPorMesa,
  chamadosPorMesa,
}: {
  mesas: SalaMesa[];
  prontosPorMesa: Map<string, number>;
  chamadosPorMesa: Map<string, number>;
}) {
  if (mesas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Nenhuma mesa atribuída a você no momento.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {mesas.map((m) => {
        const prontos = prontosPorMesa.get(m.id) ?? 0;
        const chamados = chamadosPorMesa.get(m.id) ?? 0;
        return (
          <div
            key={m.id}
            className="rounded-xl border border-border bg-card p-4 text-center shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Mesa
            </div>
            <div className="text-2xl font-bold">{m.numero}</div>
            <div className="mt-2 flex flex-wrap justify-center gap-1 text-xs">
              {prontos > 0 && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  {prontos} pronto{prontos > 1 ? "s" : ""}
                </span>
              )}
              {chamados > 0 && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-semibold text-destructive">
                  {chamados} chamado{chamados > 1 ? "s" : ""}
                </span>
              )}
              {prontos === 0 && chamados === 0 && (
                <span className="text-muted-foreground">tranquila</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}