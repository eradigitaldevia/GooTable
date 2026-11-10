import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FaixaKm } from "@/lib/taxa-distancia";

export function DeliveryFaixasKm({
  faixas,
  onChange,
}: {
  faixas: FaixaKm[];
  onChange: (f: FaixaKm[]) => void;
}) {
  const set = useCallback(
    (i: number, campo: keyof FaixaKm, v: string) =>
      onChange(faixas.map((f, j) => (j === i ? { ...f, [campo]: Number(v.replace(",", ".")) || 0 } : f))),
    [faixas, onChange],
  );
  const ultimo = faixas.length ? faixas[faixas.length - 1].ate_km : 0;

  return (
    <div className="space-y-2">
      <Label>Faixas ({faixas.length})</Label>
      {faixas.map((f, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Até</span>
          <Input className="w-24" inputMode="decimal" defaultValue={f.ate_km} onBlur={(e) => set(i, "ate_km", e.target.value)} aria-label="Até km" />
          <span className="text-muted-foreground">km → R$</span>
          <Input className="w-24" inputMode="decimal" defaultValue={f.taxa} onBlur={(e) => set(i, "taxa", e.target.value)} aria-label="Taxa" />
          <Button type="button" size="icon" variant="ghost" aria-label="Remover faixa" onClick={() => onChange(faixas.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...faixas, { ate_km: ultimo + 3, taxa: 0 }])}>
        <Plus className="mr-1 h-4 w-4" /> Adicionar faixa
      </Button>
      <p className="text-xs text-muted-foreground">Acima da última faixa, o pedido de entrega é bloqueado.</p>
    </div>
  );
}