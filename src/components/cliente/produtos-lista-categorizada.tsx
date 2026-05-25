import { ProdutoCard } from "@/components/cliente/produto-card";

interface Categoria { id: string; nome: string; ordem: number; }
interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria_id: string | null;
  disponivel: boolean;
  ordem: number;
}

export function ProdutosListaCategorizada({
  produtosFiltrados,
  porCategoria,
  categorias,
  onSelect,
  readOnly = false,
}: {
  produtosFiltrados: Produto[];
  porCategoria: Map<string, Produto[]>;
  categorias: Categoria[];
  onSelect: (p: Produto) => void;
  readOnly?: boolean;
}) {
  if (produtosFiltrados.length === 0) {
    return <div className="py-16 text-center text-muted-foreground">Nenhum produto encontrado.</div>;
  }
  return (
    <>
      {[...porCategoria.entries()].map(([cid, lista]) => {
        const nome = categorias.find((c) => c.id === cid)?.nome ?? "Outros";
        return (
          <section key={cid} className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {nome}
            </h2>
            <div className="space-y-3">
              {lista.map((p) => (
                <ProdutoCard
                  key={p.id}
                  produto={p}
                  onClick={() => onSelect(p)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
