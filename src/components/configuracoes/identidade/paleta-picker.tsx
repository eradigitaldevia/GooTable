import { PALETAS_PRESETS, type PaletaPreset } from "./paleta-presets";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PaletaPicker({
  selecionadaId,
  onSelect,
  paletas = PALETAS_PRESETS,
}: {
  selecionadaId: string | null;
  onSelect: (p: PaletaPreset) => void;
  paletas?: PaletaPreset[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {paletas.map((p) => {
        const ativa = selecionadaId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className={cn(
              "group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition",
              ativa
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/60",
            )}
            aria-pressed={ativa}
          >
            <div
              className="flex h-12 overflow-hidden rounded-lg border border-border"
              aria-hidden="true"
            >
              <span className="flex-1" style={{ backgroundColor: p.cor_primaria }} />
              <span className="flex-1" style={{ backgroundColor: p.cor_secundaria }} />
              <span className="flex-1" style={{ backgroundColor: p.cor_acento }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-medium">{p.nome}</span>
                {ativa && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">{p.descricao}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}