import { useEffect, useMemo } from "react";
import { Plus, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, type CartItem, getCart, setCart } from "@/lib/cart";
import type { CategoriaPublica, ProdutoPublico } from "@/lib/cardapio-publico.functions";
import { sugerirUpsell, type MotivoUpsell } from "@/lib/upsell";
import { getImpressoes, registrarImpressoes } from "@/lib/upsell-rotacao";
import { toast } from "sonner";

interface Props {
  qrToken: string;
  produtos: ProdutoPublico[];
  categorias: CategoriaPublica[];
  items: CartItem[];
  onAdd: (next: CartItem[]) => void;
  clienteNome?: string;
  clienteId?: string;
  produtosJaPedidos?: Set<string>;
}

export function UpsellCarrinho({ qrToken, produtos, categorias, items, onAdd, clienteNome, clienteId, produtosJaPedidos }: Props) {
  const impressoes = useMemo(() => getImpressoes(qrToken), [qrToken, items.length]);
  const sugestoes = sugerirUpsell(produtos, categorias, items, 3, produtosJaPedidos, impressoes);
  const ids = sugestoes.map((s) => s.produto.id).join("|");

  useEffect(() => {
    if (ids) registrarImpressoes(qrToken, ids.split("|"));
  }, [qrToken, ids]);

  if (items.length === 0 || sugestoes.length === 0) return null;

  function adicionar(p: ProdutoPublico) {
    const atual = getCart(qrToken);
    const novoItem: CartItem = {
      produto_id: p.id,
      nome: p.nome,
      preco: Number(p.preco),
      quantidade: 1,
      cliente_nome: clienteNome,
      cliente_id: clienteId,
    };
    const next = [...atual, novoItem];
    setCart(qrToken, next);
    onAdd(next);
    toast.success(`${p.nome} adicionado`);
  }

  return (
    <section className="mt-6 rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Que tal acompanhar?</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Sugestões para completar seu pedido.</p>
      <ul className="mt-3 space-y-2">
        {sugestoes.map(({ produto: p, motivo }) => {
          const badge = MOTIVO_LABEL[motivo];
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border p-2">
              {p.imagem_url ? (
                <img
                  src={p.imagem_url}
                  alt={p.nome}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 flex-none rounded-md object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.nome}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{formatBRL(Number(p.preco))}</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    {badge}
                  </Badge>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => adicionar(p)}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const MOTIVO_LABEL: Record<MotivoUpsell, string> = {
  destaque: "⭐ Destaque",
  bebida: "🥤 Combina com seu pedido",
  sobremesa: "🍰 Para finalizar",
  popular: "👍 Mais pedidos",
};