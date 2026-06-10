import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useArtistas,
  useRepassesCouvert,
  usePagarRepassesCouvert,
} from "@/hooks/use-couvert-artistico";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function RepassesTab({ restauranteId }: { restauranteId: string }) {
  const [status, setStatus] = useState<"pendente" | "pago" | "todos">("pendente");
  const [artistaId, setArtistaId] = useState<string | "todos">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const { data: artistas = [] } = useArtistas(restauranteId);
  const { data: repasses = [], isLoading } = useRepassesCouvert(restauranteId, {
    status,
    artistaId: artistaId === "todos" ? undefined : artistaId,
  });
  const pagar = usePagarRepassesCouvert(restauranteId);

  const totais = useMemo(() => {
    const pendentes = repasses.filter((r) => r.status === "pendente");
    const pagos = repasses.filter((r) => r.status === "pago");
    return {
      pendente: pendentes.reduce((a, r) => a + r.valor_repasse, 0),
      pago: pagos.reduce((a, r) => a + r.valor_repasse, 0),
    };
  }, [repasses]);

  const valorSelecionado = repasses
    .filter((r) => selecionados.has(r.id))
    .reduce((a, r) => a + r.valor_repasse, 0);

  function toggle(id: string, checked: boolean) {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) return setSelecionados(new Set());
    setSelecionados(new Set(repasses.filter((r) => r.status === "pendente").map((r) => r.id)));
  }

  async function handlePagar() {
    if (selecionados.size === 0) return;
    try {
      const r = await pagar.mutateAsync({ ids: Array.from(selecionados) });
      toast.success(`${r.count} repasse(s) marcado(s) como pago(s)`);
      setSelecionados(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao pagar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-3">
          <div className="text-xs uppercase text-muted-foreground">Pendente</div>
          <div className="text-xl font-semibold">{brl(totais.pendente)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs uppercase text-muted-foreground">Pago</div>
          <div className="text-xl font-semibold">{brl(totais.pago)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs uppercase text-muted-foreground">Selecionado</div>
          <div className="text-xl font-semibold">{brl(valorSelecionado)}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={artistaId} onValueChange={(v) => setArtistaId(v as typeof artistaId)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Artista" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os artistas</SelectItem>
            {artistas.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handlePagar} disabled={selecionados.size === 0 || pagar.isPending}>
            {pagar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Marcar como pago ({selecionados.size})
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">
                <Checkbox
                  checked={
                    selecionados.size > 0 &&
                    repasses.filter((r) => r.status === "pendente").every((r) => selecionados.has(r.id))
                  }
                  onCheckedChange={(c) => toggleAll(!!c)}
                />
              </th>
              <th className="px-3 py-2 text-left">Apresentação</th>
              <th className="px-3 py-2 text-left">Artista</th>
              <th className="px-3 py-2 text-right">Couvert total</th>
              <th className="px-3 py-2 text-right">% repasse</th>
              <th className="px-3 py-2 text-right">Peso</th>
              <th className="px-3 py-2 text-right">Repasse</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Calculado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
            ) : repasses.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhum repasse neste filtro.</td></tr>
            ) : repasses.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  {r.status === "pendente" && (
                    <Checkbox
                      checked={selecionados.has(r.id)}
                      onCheckedChange={(c) => toggle(r.id, !!c)}
                    />
                  )}
                </td>
                <td className="px-3 py-2">{r.apresentacao_nome}</td>
                <td className="px-3 py-2 font-medium">{r.artista_nome}</td>
                <td className="px-3 py-2 text-right">{brl(r.valor_couvert_total)}</td>
                <td className="px-3 py-2 text-right">{r.percentual_repasse.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right">{r.peso.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right font-semibold">{brl(r.valor_repasse)}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (r.status === "pago"
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-amber-500/15 text-amber-700")
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(r.calculado_em).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}