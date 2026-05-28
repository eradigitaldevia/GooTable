import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { GarconsRoster } from "@/components/admin/garcons/garcons-roster";
import { MesasGarcomPanel } from "@/components/admin/garcons/mesas-garcom-panel";
import { ComissoesPanel } from "@/components/admin/garcons/comissoes-panel";
import { MetasBonusPanel } from "@/components/admin/garcons/metas-bonus-panel";

export const Route = createFileRoute("/_authenticated/admin/garcons")({
  component: GarconsPage,
});

function GarconsPage() {
  const { user } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);
  const search = Route.useSearch() as { tab?: string };
  const navigate = useNavigate({ from: Route.fullPath });

  const tab = search.tab ?? "mesas";

  if (isLoading || !restaurante) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garçons</h1>
        <p className="text-sm text-muted-foreground">
          Cadastro de garçons, atribuição por mesa e gestão de comissões.
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ search: (prev) => ({ ...prev, tab: v }) })
        }
      >
        <TabsList className="grid w-full grid-cols-2 h-auto sm:inline-flex sm:w-auto sm:h-9 sm:grid-cols-none">
          <TabsTrigger value="mesas">Mesas</TabsTrigger>
          <TabsTrigger value="garcons">Garçons</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="bonus">Metas & Bônus</TabsTrigger>
        </TabsList>
        <TabsContent value="mesas" className="mt-4">
          <MesasGarcomPanel restauranteId={restaurante.id} />
        </TabsContent>
        <TabsContent value="garcons" className="mt-4">
          <GarconsRoster restauranteId={restaurante.id} />
        </TabsContent>
        <TabsContent value="comissoes" className="mt-4">
          <ComissoesPanel restauranteId={restaurante.id} />
        </TabsContent>
        <TabsContent value="bonus" className="mt-4">
          <MetasBonusPanel restauranteId={restaurante.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}