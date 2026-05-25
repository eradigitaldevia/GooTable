import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { Tags } from "lucide-react";

import { CategoriaDialog } from "@/components/cardapio/categoria-dialog";
import { CategoriaChip } from "@/components/cardapio/categoria-chip";
import { ProdutoDialog } from "@/components/cardapio/produto-dialog";
import { ProdutoCard } from "@/components/cardapio/produto-card";
import { useCardapio } from "@/hooks/use-cardapio";
import { listarCardapioFn } from "@/lib/cardapio.functions";
import { PageHeaderSkeleton } from "@/components/admin/skeletons/page-header-skeleton";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/admin/cardapio")({
  loader: ({ context }) => {
    const { queryClient, restauranteId } = context as {
      queryClient: import("@tanstack/react-query").QueryClient;
      restauranteId?: string;
    };
    if (restauranteId) {
      queryClient.ensureQueryData({
        queryKey: ["cardapio", restauranteId],
        queryFn: () => listarCardapioFn({ data: { restauranteId } }),
      });
    }
  },
  component: Cardapio,
});

function Cardapio() {
  const { user } = useAuth();
  const { data: restaurante, isLoading: carregandoRestaurante } = useMeuRestaurante(user?.id);

  const { data, isLoading } = useCardapio(restaurante?.id);
  const categorias = data?.categorias ?? [];
  const produtos = data?.produtos ?? [];

  if (carregandoRestaurante || !restaurante || isLoading) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton withActions />
        <CardsGridSkeleton count={6} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cardápio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie suas categorias e produtos.
          </p>
        </div>
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
          <div className="flex flex-wrap gap-2">
            {categorias.map((c) => (
              <CategoriaChip
                key={c.id}
                cat={c}
                restauranteId={restaurante.id}
                onChanged={() => {}}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="text-sm font-semibold text-muted-foreground">
          Produtos ({produtos.length})
        </div>
        {produtos.length === 0 ? (
          <EmptyState variant="dashed" description="Nenhum produto cadastrado ainda." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => (
              <ProdutoCard
                key={p.id}
                produto={p}
                categorias={categorias}
                restauranteId={restaurante.id}
                onChanged={() => {}}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
