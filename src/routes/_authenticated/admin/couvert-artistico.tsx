import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArtistasTab } from "@/components/couvert-artistico/artistas-tab";
import { ApresentacoesTab } from "@/components/couvert-artistico/apresentacoes-tab";
import { RepassesTab } from "@/components/couvert-artistico/repasses-tab";
import { TaxaCouvertTab } from "@/components/couvert-artistico/taxa-couvert-tab";

const searchSchema = z.object({
  tab: z
    .enum(["taxa-couvert", "artistas", "apresentacoes", "repasses"])
    .default("taxa-couvert"),
});

export const Route = createFileRoute("/_authenticated/admin/couvert-artistico")({
  validateSearch: searchSchema,
  component: CouvertArtisticoPage,
});

function CouvertArtisticoPage() {
  const { user } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  if (isLoading || !restaurante) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  const habilitado = restaurante.couvert_artistico_habilitado ?? false;
  const activeTab =
    !habilitado && tab !== "taxa-couvert" ? "taxa-couvert" : tab;

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Couvert artístico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre artistas, abra apresentações ao vivo e acompanhe o repasse
          do couvert arrecadado.
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          navigate({
            search: {
              tab: v as "taxa-couvert" | "artistas" | "apresentacoes" | "repasses",
            },
          })
        }
      >
        <TabsList>
          <TabsTrigger value="taxa-couvert">Taxa de couvert</TabsTrigger>
          {habilitado && <TabsTrigger value="artistas">Artistas</TabsTrigger>}
          {habilitado && (
            <TabsTrigger value="apresentacoes">Apresentações</TabsTrigger>
          )}
          {habilitado && <TabsTrigger value="repasses">Repasses</TabsTrigger>}
        </TabsList>
        <TabsContent value="taxa-couvert" className="mt-4">
          <TaxaCouvertTab />
        </TabsContent>
        {habilitado && (
          <>
        <TabsContent value="artistas" className="mt-4">
          <ArtistasTab restauranteId={restaurante.id} />
        </TabsContent>
        <TabsContent value="apresentacoes" className="mt-4">
          <ApresentacoesTab restauranteId={restaurante.id} />
        </TabsContent>
        <TabsContent value="repasses" className="mt-4">
          <RepassesTab restauranteId={restaurante.id} />
        </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}