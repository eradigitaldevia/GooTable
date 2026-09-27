import { useState } from "react";
import { Factory, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInsumos, useMovimentos } from "@/hooks/use-estoque";
import { dataLocal, inicioDoMes } from "@/lib/data-fuso";
import { formatBRL } from "@/lib/cart";
import { MovimentoDialog } from "./movimento-dialog";
import { ProducaoDialog } from "./producao-dialog";
import { TIPO_MOV_LABEL, formatQtd } from "./estoque-format";

export function AbaMovimentos({ restauranteId }: { restauranteId: string }) {
  const { data: insumos = [] } = useInsumos(restauranteId);
  const [inicio, setInicio] = useState(() => dataLocal(inicioDoMes()));
  const [fim, setFim] = useState(() => dataLocal());
  const [insumoId, setInsumoId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [producao, setProducao] = useState(false);
  const { data: movs = [], isLoading } = useMovimentos({ restauranteId, inicio, fim, insumoId, tipo });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input type="date" className="w-40" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-label="Início" />
        <Input type="date" className="w-40" value={fim} onChange={(e) => setFim(e.target.value)} aria-label="Fim" />
        <Select value={insumoId ?? "all"} onValueChange={(v) => setInsumoId(v === "all" ? null : v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os insumos</SelectItem>
            {insumos.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipo ?? "all"} onValueChange={(v) => setTipo(v === "all" ? null : v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TIPO_MOV_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setProducao(true)}>
            <Factory className="mr-2 h-4 w-4" /> Produção
          </Button>
          <Button onClick={() => setNovo(true)}>
            <Plus className="mr-2 h-4 w-4" /> Movimentação
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Insumo</th>
              <th className="p-3">Tipo</th>
              <th className="p-3 text-right">Quantidade</th>
              <th className="p-3 text-right">Custo un.</th>
              <th className="p-3 text-right">Saldo após</th>
              <th className="p-3">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td className="p-3 text-muted-foreground" colSpan={7}>Carregando…</td></tr>}
            {!isLoading && movs.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={7}>Nenhuma movimentação no período.</td></tr>
            )}
            {movs.map((m) => (
              <tr key={m.id}>
                <td className="p-3 whitespace-nowrap">{new Date(m.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td className="p-3">{m.insumo_nome}</td>
                <td className="p-3">{TIPO_MOV_LABEL[m.tipo] ?? m.tipo}</td>
                <td className={`p-3 text-right ${m.quantidade < 0 ? "text-destructive" : "text-primary"}`}>
                  {m.quantidade > 0 ? "+" : ""}{formatQtd(m.quantidade, m.unidade)}
                </td>
                <td className="p-3 text-right">{m.custo_unit != null ? formatBRL(m.custo_unit) : "—"}</td>
                <td className="p-3 text-right">{formatQtd(m.saldo_apos, m.unidade)}</td>
                <td className="p-3 text-muted-foreground">{m.observacao ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MovimentoDialog restauranteId={restauranteId} open={novo} onClose={() => setNovo(false)} />
      <ProducaoDialog restauranteId={restauranteId} open={producao} onClose={() => setProducao(false)} />
    </div>
  );
}
