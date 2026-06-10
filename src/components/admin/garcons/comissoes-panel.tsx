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
import { toast } from "sonner";
import {
  useComissoes,
  usePagarComissoes,
  useResumoComissoes,
  useComissoesTaxaServico,
} from "@/hooks/use-garcons";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { RelatorioExportarCard } from "./relatorio-exportar-card";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ComissoesPanel({ restauranteId }: { restauranteId: string }) {
  const [status, setStatus] = useState<"pendente" | "pago" | "todos">("pendente");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const { data: resumo = [] } = useResumoComissoes(restauranteId);
  const { data: comissoes = [], isLoading } = useComissoes(restauranteId, { status });
  const pagar = usePagarComissoes(restauranteId);
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const modoItem = restaurante?.comissao_modo === "item";
  const repasseHabilitado = !!restaurante?.taxa_servico_repasse_habilitado;
  const { data: taxas = [], isLoading: loadingTaxas } = useComissoesTaxaServico(
    repasseHabilitado ? restauranteId : undefined,
    { status },
  );
  const [selecionadosTaxa, setSelecionadosTaxa] = useState<Set<string>>(new Set());

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

  const valorSelecionadoTaxa = taxas
    .filter((t) => selecionadosTaxa.has(t.id))
    .reduce((acc, t) => acc + t.valor_repasse, 0);

  const handlePagarTaxa = async () => {
    if (selecionadosTaxa.size === 0) return;
    try {
      const r = await pagar.mutateAsync({ ids: Array.from(selecionadosTaxa) });
      toast.success(`${r.count} repasse(s) marcado(s) como pago(s)`);
      setSelecionadosTaxa(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao pagar");
    }
  };

  const toggleTaxa = (id: string, checked: boolean) => {
    setSelecionadosTaxa((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  };
  const toggleAllTaxa = (checked: boolean) => {
    if (!checked) {
      setSelecionadosTaxa(new Set());
      return;
    }
    setSelecionadosTaxa(new Set(taxas.filter((t) => t.status === "pendente").map((t) => t.id)));
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

      <RelatorioExportarCard restauranteId={restauranteId} />

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

        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
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
        </div>
      </Card>

      {repasseHabilitado && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <div className="text-sm font-semibold">Repasse de taxa de serviço</div>
              <div className="text-xs text-muted-foreground">
                Calculado por comanda fechada, rateado entre os garçons que atenderam.
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selecionadosTaxa.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selecionadosTaxa.size} selecionado(s) — {brl(valorSelecionadoTaxa)}
                </span>
              )}
              <Button
                disabled={selecionadosTaxa.size === 0 || pagar.isPending}
                onClick={handlePagarTaxa}
              >
                Marcar como pagos
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-10">
                    {status === "pendente" && (
                      <Checkbox
                        checked={
                          taxas.length > 0 &&
                          taxas.every((t) => selecionadosTaxa.has(t.id))
                        }
                        onCheckedChange={(v) => toggleAllTaxa(!!v)}
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Garçom</th>
                  <th className="px-4 py-3">Comanda</th>
                  <th className="px-4 py-3 text-right">Taxa total</th>
                  <th className="px-4 py-3 text-right">% repasse</th>
                  <th className="px-4 py-3 text-right">Peso</th>
                  <th className="px-4 py-3 text-right">Repasse</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingTaxas && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!loadingTaxas && taxas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum repasse neste filtro.
                    </td>
                  </tr>
                )}
                {taxas.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      {t.status === "pendente" && (
                        <Checkbox
                          checked={selecionadosTaxa.has(t.id)}
                          onCheckedChange={(v) => toggleTaxa(t.id, !!v)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.calculado_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-medium">{t.garcom_nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.comanda_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{brl(t.valor_taxa_total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.percentual_repasse.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.peso.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {brl(t.valor_repasse)}
                    </td>
                    <td className="px-4 py-3">
                      {t.status === "pago" ? (
                        <Badge variant="secondary">Pago</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}