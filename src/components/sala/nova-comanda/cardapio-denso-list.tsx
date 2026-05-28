import { useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/cart";
import type { Categoria, Produto } from "@/lib/cardapio.functions";

export function CardapioDensoList({
  categorias,
  produtos,
  qtdNoCarrinho,
  onAdd,
  onRemove,
}: {
  categorias: Categoria[];
  produtos: Produto[];
  qtdNoCarrinho: Map<string, number>;
  onAdd: (produtoId: string) => void;
  onRemove: (produtoId: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | "todas">("todas");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos
      .filter((p) => p.disponivel)
      .filter((p) =>
        categoriaId === "todas" ? true : p.categoria_id === categoriaId,
      )
      .filter((p) => (termo ? p.nome.toLowerCase().includes(termo) : true));
  }, [produtos, busca, categoriaId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="pl-9"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <CategoriaChip
          label="Todas"
          ativa={categoriaId === "todas"}
          onClick={() => setCategoriaId("todas")}
        />
        {categorias.map((c) => (
          <CategoriaChip
            key={c.id}
            label={c.nome}
            ativa={categoriaId === c.id}
            onClick={() => setCategoriaId(c.id)}
          />
        ))}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {filtrados.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </li>
        ) : (
          filtrados.map((p) => {
            const qtd = qtdNoCarrinho.get(p.id) ?? 0;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(Number(p.preco))}
                  </p>
                </div>
                {qtd > 0 ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background hover:bg-muted"
                      aria-label="Remover"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {qtd}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdd(p.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
                      aria-label="Adicionar"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdd(p.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
                    aria-label="Adicionar"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function CategoriaChip({
  label,
  ativa,
  onClick,
}: {
  label: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        ativa
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}