import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listarCardapioFn } from "@/lib/cardapio.functions";
import { PageHeaderSkeleton } from "@/components/admin/skeletons/page-header-skeleton";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";
import { CardapioItensPanel } from "@/components/cardapio/cardapio-itens-panel";
import { DestinosPreparoPanel } from "@/components/cardapio/destinos-preparo-panel";
import { CardapioPreviaPanel } from "@/components/cardapio/cardapio-previa-panel";
import { BannersPanel } from "@/components/cardapio/banners-panel";

const searchSchema = z.object({
  tab: z.enum(["itens", "destinos", "banners", "previa"]).default("itens"),
});

export const Route = createFileRoute("/_authenticated/admin/cardapio")({
  validateSearch: searchSchema,
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
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  if (carregandoRestaurante || !restaurante) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton withActions />
        <CardsGridSkeleton count={6} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Cardápio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie os produtos, categorias, destinos de preparo e visualize a prévia do seu cardápio.
        </p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({
            search: { tab: v as "itens" | "destinos" | "banners" | "previa" },
          })
        }
      >
        <TabsList>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="destinos">Destinos de preparo</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="previa">Prévia</TabsTrigger>
        </TabsList>

        <TabsContent value="itens" className="mt-6">
          <CardapioItensPanel restaurante={restaurante} />
        </TabsContent>
        <TabsContent value="destinos" className="mt-6">
          <DestinosPreparoPanel restaurante={restaurante} />
        </TabsContent>
        <TabsContent value="banners" className="mt-6">
          <BannersPanel restaurante={restaurante} />
        </TabsContent>
        <TabsContent value="previa" className="mt-6">
          <CardapioPreviaPanel restaurante={restaurante} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
