import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw } from "lucide-react";
import type { Periodo } from "@/hooks/use-financeiro";

export function FinanceiroHeader({
  periodo,
  onPeriodo,
  onNovo,
  onIntegrar,
  integrando,
}: {
  periodo: Periodo;
  onPeriodo: (p: Periodo) => void;
  onNovo: () => void;
  onIntegrar: () => void;
  integrando: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contas a pagar e receber, DRE gerencial e fluxo de caixa.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          De
          <Input
            type="date"
            value={periodo.inicio}
            onChange={(e) => e.target.value && onPeriodo({ ...periodo, inicio: e.target.value })}
            className="mt-1 w-40"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Até
          <Input
            type="date"
            value={periodo.fim}
            onChange={(e) => e.target.value && onPeriodo({ ...periodo, fim: e.target.value })}
            className="mt-1 w-40"
          />
        </label>
        <Button variant="outline" onClick={onIntegrar} disabled={integrando}>
          <RefreshCw className="h-4 w-4" />
          Importar do caixa
        </Button>
        <Button onClick={onNovo}>
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Button>
      </div>
    </header>
  );
}
