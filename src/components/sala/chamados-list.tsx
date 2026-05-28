import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import type { SalaChamado } from "@/lib/sala.functions";

function minutosDesde(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function ChamadosList({
  chamados,
  onAtender,
  pendingId,
}: {
  chamados: SalaChamado[];
  onAtender?: (chamadoId: string) => void;
  pendingId?: string | null;
}) {
  if (chamados.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Nenhum chamado pendente.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {chamados.map((c) => {
        const min = minutosDesde(c.criado_em);
        const urg = min >= 3 ? "danger" : min >= 1 ? "warn" : "ok";
        const borda =
          urg === "danger"
            ? "border-l-destructive"
            : urg === "warn"
              ? "border-l-amber-500"
              : "border-l-emerald-500";
        return (
          <li
            key={c.id}
            className={`flex items-center gap-3 rounded-xl border border-l-4 bg-card p-4 shadow-sm ${borda}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Mesa {c.mesa_numero}</div>
              <div className="truncate text-sm text-muted-foreground">
                {c.tipo_nome} · há {min} min
              </div>
            </div>
            {onAtender && (
              <Button
                size="sm"
                disabled={pendingId === c.id}
                onClick={() => onAtender(c.id)}
              >
                <Check className="mr-1 h-4 w-4" /> Atendido
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}