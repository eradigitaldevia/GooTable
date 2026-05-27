import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useComissoes, usePagarComissoes, useResumoComissoes } from "@/hooks/use-garcons";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useGerarRelatorioComissoes } from "@/hooks/use-relatorios";
import { exportarRelatorioCSV, gerarRelatorioPDF } from "@/lib/relatorios-export";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ComissoesPanel({ restauranteId }: { restauranteId: string }) {
  const [status, setStatus] = useState<"pendente" | "pago" | "todos">("pendente");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const [inicio, setInicio] = useState(primeiroDia.toISOString().slice(0, 10));
  const [fim, setFim] = useState(hoje.toISOString().slice(0, 10));
  const { data: resumo = [] } = useResumoComissoes(restauranteId);
  const { data: comissoes = [], isLoading } = useComissoes(restauranteId, { status });
  const pagar = usePagarComissoes(restauranteId);
  const gerarRelatorio = useGerarRelatorioComissoes();
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const modoItem = restaurante?.comissao_modo === "item";

  const totalPendente = useMemo(
    () => resumo.reduce((acc, r) => acc + Number(r.pendente ?? 0), 0),
    [resumo],
  );
  const totalPago = useMemo(
    () => resumo.reduce((acc, r) => acc + Number(r.pago ?? 0), 0),
    [resumo],
  );

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelecionados(new Set());
      return;
    }
    setSelecionados(new Set(comissoes.filter((c) => c.status === "pendente").map((c) => c.id)));
  };

  const toggle = (id: string, checked: boolean) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const valorSelecionado = comissoes
    .filter((c) => selecionados.has(c.id))
    .reduce((acc, c) => acc + c.valor_comissao, 0);

  const handlePagar = async () => {
    if (selecionados.size === 0) return;
    try {
      const r = await pagar.mutateAsync({ ids: Array.from(selecionados) });
      toast.success(`${r.count} comissão(ões) marcada(s) como paga(s)`);
      setSelecionados(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao pagar");
    }
  };

  const handleExportar = async (formato: "csv" | "pdf") => {
    try {
      const rel = await gerarRelatorio.mutateAsync({
        restauranteId,
        inicio: `${inicio}T00:00:00.000Z`,
        fim: `${fim}T23:59:59.999Z`,
      });
      if (formato === "csv") exportarRelatorioCSV(rel);
      else gerarRelatorioPDF(rel);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar relatório");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Pendente</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{brl(totalPendente)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Pago</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{brl(totalPago)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Garçons ativos</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {resumo.filter((r) => r.ativo).length}
          </div>
          {modoItem && (
            <Badge variant="outline" className="mt-2">Cálculo por item</Badge>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="rel-inicio" className="text-xs">De</Label>
            <Input
              id="rel-inicio"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div>
            <Label htmlFor="rel-fim" className="text-xs">Até</Label>
            <Input
              id="rel-fim"
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={gerarRelatorio.isPending}
              onClick={() => handleExportar("csv")}
            >
              <Download className="mr-1 h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              size="sm"
              disabled={gerarRelatorio.isPending}
              onClick={() => handleExportar("pdf")}
            >
              <FileText className="mr-1 h-4 w-4" />
              {gerarRelatorio.isPending ? "Gerando…" : "Gerar PDF"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="pago">Pagas</SelectItem>
                <SelectItem value="todos">Todas</SelectItem>
              </SelectContent>
            </Select>
            {selecionados.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selecionados.size} selecionada(s) — {brl(valorSelecionado)}
              </span>
            )}
          </div>
          <Button
            disabled={selecionados.size === 0 || pagar.isPending}
            onClick={handlePagar}
          >
            Marcar como pagas
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-10">
                {status === "pendente" && (
                  <Checkbox
                    checked={
                      comissoes.length > 0 &&
                      comissoes.every((c) => selecionados.has(c.id))
                    }
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                )}
              </th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Garçom</th>
              <th className="px-4 py-3 text-right">Pedido</th>
              <th className="px-4 py-3 text-right">%</th>
              <th className="px-4 py-3 text-right">Peso</th>
              <th className="px-4 py-3 text-right">Comissão</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && comissoes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhuma comissão neste filtro.
                </td>
              </tr>
            )}
            {comissoes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  {c.status === "pendente" && (
                    <Checkbox
                      checked={selecionados.has(c.id)}
                      onCheckedChange={(v) => toggle(c.id, !!v)}
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(c.calculado_em).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 font-medium">{c.garcom_nome}</td>
                <td className="px-4 py-3 text-right tabular-nums">{brl(c.valor_pedido)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {Number(c.percentual).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {Number(c.peso).toFixed(0)}%
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {brl(c.valor_comissao)}
                </td>
                <td className="px-4 py-3">
                  {c.status === "pago" ? (
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
    </div>
  );
}