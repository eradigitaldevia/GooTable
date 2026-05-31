import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useMeuPapel } from "@/hooks/use-equipe";
import { useVerificarPlatformAdmin } from "@/hooks/use-superadmin";
import { useTurnoAtivo } from "@/hooks/use-caixa";
import { AbrirCaixaCard } from "@/components/admin/caixa/abrir-caixa-card";
import { TurnoAbertoPainel } from "@/components/admin/caixa/turno-aberto-painel";
import { MovimentosPanel } from "@/components/admin/caixa/movimentos-panel";
import { RelatorioPanel } from "@/components/admin/caixa/relatorio-panel";

export const Route = createFileRoute("/_authenticated/admin/caixa")({
  component: CaixaPage,
});

function CaixaPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: papelData } = useMeuPapel(!!user);
  const { data: pa } = useVerificarPlatformAdmin(!!user);
  const papel = papelData?.papel ?? null;
  const podeOperar = pa?.isPlatformAdmin || papel === "admin" || papel === "caixa";

  const { data: turno, isLoading } = useTurnoAtivo(restaurante?.id);

  if (!restaurante) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!podeOperar) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Acesso restrito. Apenas administradores ou operadores de caixa podem ver esta página.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Caixa</h1>
        <p className="text-sm text-muted-foreground">
          Controle de turno: abertura, sangrias, suprimentos e fechamento com conferência.
        </p>
      </div>

      <Tabs defaultValue="caixa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentos</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório do turno</TabsTrigger>
        </TabsList>

        <TabsContent value="caixa">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando turno…</div>
          ) : turno ? (
            <TurnoAbertoPainel restauranteId={restaurante.id} turno={turno} />
          ) : (
            <AbrirCaixaCard
              restauranteId={restaurante.id}
              operadorPadrao={user?.email ?? undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="movimentos">
          <MovimentosPanel restauranteId={restaurante.id} turno={turno ?? null} />
        </TabsContent>

        <TabsContent value="relatorio">
          <RelatorioPanel restauranteId={restaurante.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}