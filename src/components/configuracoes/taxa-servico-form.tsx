import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TaxaServicoForm({
  habilitada,
  percentual,
  descricao,
  onChange,
}: {
  habilitada: boolean;
  percentual: string;
  descricao: string;
  onChange: (patch: {
    taxa_servico_habilitada?: boolean;
    taxa_servico_percentual?: string;
    taxa_servico_descricao?: string;
  }) => void;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Taxa de serviço</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Percentual sugerido sobre o total da conta (ex.: 10%). Por lei, a
            taxa é <strong>opcional</strong> para o cliente — ele pode pedir
            para retirá-la a qualquer momento.
          </p>
        </div>
        <Switch
          checked={habilitada}
          onCheckedChange={(v) => onChange({ taxa_servico_habilitada: v })}
          aria-label="Habilitar taxa de serviço"
        />
      </div>

      {habilitada && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Percentual (%)</Label>
            <Input
              inputMode="decimal"
              placeholder="10"
              value={percentual}
              onChange={(e) => onChange({ taxa_servico_percentual: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Entre 0 e 30%.</p>
          </div>
          <div className="space-y-1">
            <Label>Descrição exibida (opcional)</Label>
            <Input
              placeholder="Taxa de serviço (10%) — opcional"
              value={descricao}
              onChange={(e) => onChange({ taxa_servico_descricao: e.target.value })}
              maxLength={200}
            />
          </div>
        </div>
      )}
    </section>
  );
}
