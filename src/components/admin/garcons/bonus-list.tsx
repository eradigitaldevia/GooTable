import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { toast } from "sonner";
import {
  useCalcularBonus,
  useGarcomBonus,
  usePagarBonus,
} from "@/hooks/use-garcom-bonus";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BonusList({ restauranteId }: { restauranteId: string }) {
  const [status, setStatus] = useState<"pendente" | "pago" | "todos">("pendente");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { data: bonus = [], isLoading } = useGarcomBonus(restauranteId, { status });
  const calcular = useCalcularBonus(restauranteId);
  const pagar = usePagarBonus(restauranteId);

  const total = useMemo(
    () => bonus.reduce((acc, b) => acc + (b.status === "pendente" ? b.valor : 0), 0),
    [bonus],
  );

  const toggleAll = (c: boolean) => {
    if (!c) return setSel(new Set());
    setSel(new Set(bonus.filter((b) => b.status === "pendente").map((b) => b.id)));
  };
  const toggle = (id: string, c: boolean) =>
    setSel((prev) => {
      const n = new Set(prev);
      c ? n.add(id) : n.delete(id);
      return n;
    });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Total pendente: <span className="font-semibold tabular-nums">{brl(total)}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={calcular.isPending}
            onClick={async () => {
              try {
                const r = await calcular.mutateAsync(undefined);
                toast.success(`${r.count} meta(s) processada(s)`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              }
            }}
          >
            <Calculator className="mr-2 h-4 w-4" /> Calcular bônus do período
          </Button>
          <Button
            size="sm"
            disabled={sel.size === 0 || pagar.isPending}
            onClick={async () => {
              try {
                const r = await pagar.mutateAsync(Array.from(sel));
                toast.success(`${r.count} bônus pago(s)`);
                setSel(new Set());
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              }
            }}
          >
            Marcar como pagos
          </Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 w-10">
              {status === "pendente" && (
                <Checkbox
                  checked={bonus.length > 0 && bonus.every((b) => sel.has(b.id))}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
              )}
            </th>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3">Garçom</th>
            <th className="px-4 py-3">Meta</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && bonus.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Nenhum bônus neste filtro.
              </td>
            </tr>
          )}
          {bonus.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3">
                {b.status === "pendente" && (
                  <Checkbox
                    checked={sel.has(b.id)}
                    onCheckedChange={(v) => toggle(b.id, !!v)}
                  />
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(b.periodo_ref).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3 font-medium">{b.garcom_nome}</td>
              <td className="px-4 py-3">
                {b.meta_nome}{" "}
                <Badge variant="outline" className="ml-1 capitalize">
                  {b.meta_tipo}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {brl(b.valor)}
              </td>
              <td className="px-4 py-3">
                {b.status === "pago" ? (
                  <Badge variant="secondary">Pago</Badge>
                ) : (
                  <Badge variant="outline">Pendente</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}