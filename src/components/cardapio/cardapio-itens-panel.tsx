import { useMemo, useRef, useState, useEffect } from "react";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CategoriaDialog } from "@/components/cardapio/categoria-dialog";
import { CategoriaChip } from "@/components/cardapio/categoria-chip";
import { ProdutoDialog } from "@/components/cardapio/produto-dialog";
import { ProdutoCard } from "@/components/cardapio/produto-card";
import { ProdutoRow } from "@/components/cardapio/produto-row";
import {
  CardapioToolbar,
  type SortOption,
  type AvailabilityFilter,
  type DestinoFilter,
  type ViewMode,
} from "@/components/cardapio/cardapio-toolbar";
import { useCardapio } from "@/hooks/use-cardapio";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Restaurante } from "@/lib/restaurante.functions";

export function CardapioItensPanel({ restaurante }: { restaurante: Restaurante }) {
  const { data, isLoading } = useCardapio(restaurante.id);
  const categorias = data?.categorias ?? [];
  const produtos = data?.produtos ?? [];

  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [destinoFilter, setDestinoFilter] = useState<DestinoFilter>("all");
  const [sort, setSort] = useState<SortOption>("default");
  const [view, setView] = useState<ViewMode>("grid");
  const [groupByCategoria, setGroupByCategoria] = useState(true);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        (target as HTMLElement).isContentEditable
      );
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearch("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const produtosFiltrados = useMemo(() => {
    const q = normalize(search.trim());
    let list = produtos.filter((p) => {
      if (availability === "available" && !p.disponivel) return false;
      if (availability === "unavailable" && p.disponivel) return false;
      if (categoriaSelecionada !== null) {
        if (categoriaSelecionada === "__none__") {
          if (p.categoria_id) return false;
        } else if (p.categoria_id !== categoriaSelecionada) {
          return false;
        }
      }
      if (destinoFilter !== "all") {
        const cat = categorias.find((c) => c.id === p.categoria_id);
        const d = p.destino_override ?? cat?.destino ?? "cozinha";
        if (d !== destinoFilter) return false;
      }
      if (q) {
        const hay = normalize(`${p.nome} ${p.descricao ?? ""}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    switch (sort) {
      case "name-asc":
        list = [...list].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        break;
      case "price-asc":
        list = [...list].sort((a, b) => Number(a.preco) - Number(b.preco));
        break;
      case "price-desc":
        list = [...list].sort((a, b) => Number(b.preco) - Number(a.preco));
        break;
      case "unavailable-first":
        list = [...list].sort((a, b) => Number(a.disponivel) - Number(b.disponivel));
        break;
      default:
        break;
    }
    return list;
  }, [produtos, search, availability, destinoFilter, categoriaSelecionada, sort, categorias]);

  const hasActiveFilters =
    search.trim() !== "" ||
    availability !== "all" ||
    destinoFilter !== "all" ||
    categoriaSelecionada !== null ||
    sort !== "default";

  function clearFilters() {
    setSearch("");
    setAvailability("all");
    setDestinoFilter("all");
    setCategoriaSelecionada(null);
    setSort("default");
  }

  const totalDisponiveis = produtos.filter((p) => p.disponivel).length;

  const grupos = useMemo(() => {
    if (!groupByCategoria) return null;
    const map = new Map<string | null, typeof produtosFiltrados>();
    for (const p of produtosFiltrados) {
      const key = p.categoria_id;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    const ordered: Array<{ id: string | null; nome: string; destino?: "cozinha" | "bar"; itens: typeof produtosFiltrados }> = [];
    for (const c of categorias) {
      const itens = map.get(c.id);
      if (itens && itens.length) ordered.push({ id: c.id, nome: c.nome, destino: c.destino, itens });
    }
    const semCat = map.get(null);
    if (semCat && semCat.length) ordered.push({ id: null, nome: "Sem categoria", itens: semCat });
    return ordered;
  }, [groupByCategoria, produtosFiltrados, categorias]);

  if (isLoading) {
    return (
      <CardsGridSkeleton count={6} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
    );
  }

  function renderItens(itens: typeof produtosFiltrados) {
    if (view === "list") {
      return (
        <div className="flex flex-col gap-2">
          {itens.map((p) => (
            <ProdutoRow
              key={p.id}
              produto={p}
              categorias={categorias}
              restauranteId={restaurante.id}
              onChanged={() => {}}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((p) => (
          <ProdutoCard
            key={p.id}
            produto={p}
            categorias={categorias}
            restauranteId={restaurante.id}
            onChanged={() => {}}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {categorias.length} categorias · {produtos.length} produtos ({totalDisponiveis} disponíveis)
        </p>
        <div className="flex flex-wrap gap-2">
          <CategoriaDialog
            restauranteId={restaurante.id}
            onSaved={() => {}}
          />
          <ProdutoDialog
            restauranteId={restaurante.id}
            categorias={categorias}
            onSaved={() => {}}
          />
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Tags className="h-4 w-4" /> Categorias ({categorias.length})
        </div>
        {categorias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Crie sua primeira categoria para organizar o cardápio.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategoriaSelecionada(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${categoriaSelecionada === null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <div
                key={c.id}
                className={`rounded-full ring-offset-background transition ${categoriaSelecionada === c.id ? "ring-2 ring-primary" : ""}`}
              >
                <div onClick={() => setCategoriaSelecionada(categoriaSelecionada === c.id ? null : c.id)} className="cursor-pointer">
                  <CategoriaChip
                    cat={c}
                    restauranteId={restaurante.id}
                    onChanged={() => {}}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCategoriaSelecionada(categoriaSelecionada === "__none__" ? null : "__none__")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${categoriaSelecionada === "__none__" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              Sem categoria
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="sticky top-0 z-10 -mx-2 space-y-3 bg-background/80 px-2 py-2 backdrop-blur">
          <div className="text-sm font-semibold text-muted-foreground">Produtos</div>
          <CardapioToolbar
            searchInputRef={searchInputRef}
            search={search}
            onSearchChange={setSearch}
            totalFiltered={produtosFiltrados.length}
            totalProdutos={produtos.length}
            availability={availability}
            onAvailabilityChange={setAvailability}
            destino={destinoFilter}
            onDestinoChange={setDestinoFilter}
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={setView}
            groupByCategoria={groupByCategoria}
            onGroupByCategoriaChange={setGroupByCategoria}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </div>

        {produtos.length === 0 ? (
          <EmptyState variant="dashed" description="Nenhum produto cadastrado ainda." />
        ) : produtosFiltrados.length === 0 ? (
          <EmptyState
            variant="dashed"
            description="Nenhum produto corresponde aos filtros."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : groupByCategoria && grupos ? (
          <div className="space-y-6">
            {grupos.map((g) => (
              <div key={g.id ?? "__none__"} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>{g.nome}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({g.itens.length}{g.destino ? ` · ${g.destino}` : ""})
                  </span>
                </div>
                {renderItens(g.itens)}
              </div>
            ))}
          </div>
        ) : (
          renderItens(produtosFiltrados)
        )}
      </section>
    </div>
  );
}