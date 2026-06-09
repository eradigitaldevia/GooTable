import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, type CartItem, getCart, setCart } from "@/lib/cart";
import type { CategoriaPublica, ProdutoPublico } from "@/lib/cardapio-publico.functions";
import { toast } from "sonner";

interface Props {
  qrToken: string;
  produtos: ProdutoPublico[];
  categorias: CategoriaPublica[];
  items: CartItem[];
  onAdd: (next: CartItem[]) => void;
  clienteNome?: string;
  clienteId?: string;
}

const CATEGORIAS_PRIORITARIAS = /bebida|drink|suco|cerveja|vinho|refri|sobremesa|doce/i;

export function UpsellCarrinho({ qrToken, produtos, categorias, items, onAdd, clienteNome, clienteId }: Props) {
  const idsNoCarrinho = new Set(items.map((i) => i.produto_id));

  const catsPrioritarias = new Set(
    categorias.filter((c) => CATEGORIAS_PRIORITARIAS.test(c.nome)).map((c) => c.id),
  );

  const candidatos = produtos.filter((p) => p.disponivel && !idsNoCarrinho.has(p.id));
  const ordenados = [
    ...candidatos.filter((p) => p.categoria_id && catsPrioritarias.has(p.categoria_id)),
    ...candidatos.filter((p) => !p.categoria_id || !catsPrioritarias.has(p.categoria_id)),
  ];
  const sugestoes = ordenados.slice(0, 3);

  if (sugestoes.length === 0) return null;

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
        {sugestoes.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.nome}</p>
              <p className="text-xs text-muted-foreground">{formatBRL(Number(p.preco))}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => adicionar(p)}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}