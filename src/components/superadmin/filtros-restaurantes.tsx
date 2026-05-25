import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type FiltroStatus = "todos" | "ativos" | "suspensos";

export function FiltrosRestaurantes({
  busca,
  filtro,
  onBuscaChange,
  onFiltroChange,
}: {
  busca: string;
  filtro: FiltroStatus;
  onBuscaChange: (v: string) => void;
  onFiltroChange: (v: FiltroStatus) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou slug…"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["todos", "ativos", "suspensos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFiltroChange(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${
                filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
