import { useDre, type Periodo } from "@/hooks/use-financeiro";
import { formatBRL } from "@/lib/cart";
import { cn } from "@/lib/utils";

function Linha({ label, valor, nivel = 0, total, negativo }: {
  label: string; valor: number; nivel?: number; total?: boolean; negativo?: boolean;
}) {
  return (
    <div className={cn("flex justify-between border-b py-2 text-sm", total && "bg-muted/50 font-semibold", nivel > 0 && "text-muted-foreground")}>
      <span className={cn(nivel === 1 && "pl-6", total && "pl-2")}>{label}</span>
      <span className={cn("pr-2 tabular-nums", total && valor < 0 && "text-destructive")}>
        {negativo && valor > 0 ? `(${formatBRL(valor)})` : formatBRL(valor)}
      </span>
    </div>
  );
}

export function AbaDre({ restauranteId, periodo }: { restauranteId: string; periodo: Periodo }) {
  const { data: d, isLoading, error } = useDre(restauranteId, periodo);
  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (error || !d) return <div className="text-sm text-destructive">Erro ao carregar o DRE.</div>;
  const n = (v: unknown) => Number(v ?? 0);
  return (
    <div className="max-w-3xl rounded-xl border p-2">
      <Linha label="Receita de vendas" valor={n(d.receita_vendas)} nivel={1} />
      {d.receitas_categorias.map((c) => <Linha key={c.categoria} label={c.categoria} valor={n(c.valor)} nivel={1} />)}
      <Linha label="Receita bruta" valor={n(d.receita_bruta)} total />
      <Linha label="Comissões e repasses" valor={n(d.deducoes)} nivel={1} negativo />
      <Linha label="Receita líquida" valor={n(d.receita_liquida)} total />
      <Linha label="Insumos & CMV" valor={n(d.cmv)} nivel={1} negativo />
      <Linha label="Margem de contribuição" valor={n(d.margem_contribuicao)} total />
      {d.despesas_operacionais.map((c) => (
        <Linha key={c.categoria} label={c.categoria} valor={n(c.valor)} nivel={1} negativo />
      ))}
      <Linha label="Despesas operacionais" valor={n(d.total_despesas_operacionais)} total />
      <Linha label="Resultado líquido" valor={n(d.resultado_liquido)} total />
      <p className="p-2 text-xs text-muted-foreground">
        Receita de vendas considera pagamentos confirmados; despesas pelo regime de competência (lançamentos não cancelados).
      </p>
    </div>
  );
}
