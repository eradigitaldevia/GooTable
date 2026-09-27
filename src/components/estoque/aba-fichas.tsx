import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCardapio } from "@/hooks/use-cardapio";
import { useCustoProdutos, useFichas, useInsumos } from "@/hooks/use-estoque";
import { formatBRL } from "@/lib/cart";
import { FichaDialog, type AlvoFicha } from "./ficha-dialog";

export function AbaFichas({ restauranteId }: { restauranteId: string }) {
  const { data: cardapio } = useCardapio(restauranteId);
  const { data: insumos = [] } = useInsumos(restauranteId);
  const { data: fichas = [] } = useFichas(restauranteId);
  const { data: custos = [] } = useCustoProdutos(restauranteId);
  const [alvo, setAlvo] = useState<AlvoFicha | null>(null);

  const custoMap = useMemo(() => new Map(custos.map((c) => [c.produto_id, c])), [custos]);
  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fichas) {
      const k = f.produto_id ?? f.preparo_id ?? "";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [fichas]);
  const preparos = insumos.filter((i) => i.is_preparo);
  const produtos = cardapio?.produtos ?? [];

  return (
    <div className="space-y-6">
      {preparos.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <h2 className="border-b border-border p-4 text-base font-semibold">Preparos intermediários</h2>
          <ul className="divide-y divide-border">
            {preparos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="font-medium">{p.nome}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{contagem.get(p.id) ?? 0} insumo(s)</Badge>
                  <Button size="sm" variant="outline" onClick={() => setAlvo({ tipo: "preparo", id: p.id, nome: p.nome })}>
                    Editar ficha
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <h2 className="border-b border-border p-4 text-base font-semibold">Produtos do cardápio</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3 text-right">Preço</th>
              <th className="p-3 text-right">Custo estimado</th>
              <th className="p-3 text-right">Margem</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {produtos.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={5}>Nenhum produto no cardápio.</td></tr>
            )}
            {produtos.map((p) => {
              const c = custoMap.get(p.id);
              const n = contagem.get(p.id) ?? 0;
              return (
                <tr key={p.id}>
                  <td className="p-3">
                    <span className="font-medium">{p.nome}</span>
                    {n === 0 && <span className="ml-2 text-xs text-muted-foreground">sem ficha</span>}
                  </td>
                  <td className="p-3 text-right">{formatBRL(Number(p.preco))}</td>
                  <td className="p-3 text-right">{c ? formatBRL(c.custo) : "—"}</td>
                  <td className="p-3 text-right">{c?.margem != null ? `${c.margem.toLocaleString("pt-BR")}%` : "—"}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAlvo({ tipo: "produto", id: p.id, nome: p.nome })}>
                      {n === 0 ? "Criar ficha" : "Editar ficha"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <FichaDialog restauranteId={restauranteId} alvo={alvo} insumos={insumos} fichas={fichas} onClose={() => setAlvo(null)} />
    </div>
  );
}
