import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArtistasTab } from "@/components/couvert-artistico/artistas-tab";
import { ApresentacoesTab } from "@/components/couvert-artistico/apresentacoes-tab";
import { RepassesTab } from "@/components/couvert-artistico/repasses-tab";

const searchSchema = z.object({
  tab: z.enum(["artistas", "apresentacoes", "repasses"]).default("artistas"),
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

  if (!restaurante.couvert_artistico_habilitado) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Couvert artístico</h1>
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          O couvert artístico está desabilitado. Ative em{" "}
          <a href="/admin/configuracoes" className="font-medium text-primary hover:underline">
            Configurações → Couvert
          </a>{" "}
          para gerenciar artistas, apresentações e repasses.
        </div>
      </div>
    );
  }

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
        value={tab}
        onValueChange={(v) =>
          navigate({ search: { tab: v as "artistas" | "apresentacoes" | "repasses" } })
        }
      >
        <TabsList>
          <TabsTrigger value="artistas">Artistas</TabsTrigger>
          <TabsTrigger value="apresentacoes">Apresentações</TabsTrigger>
          <TabsTrigger value="repasses">Repasses</TabsTrigger>
        </TabsList>
        <TabsContent value="artistas" className="mt-4">
          <ArtistasTab restauranteId={restaurante.id} />
        </TabsContent>
        <TabsContent value="apresentacoes" className="mt-4">
          <ApresentacoesTab restauranteId={restaurante.id} />
        </TabsContent>
        <TabsContent value="repasses" className="mt-4">
          <RepassesTab restauranteId={restaurante.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}