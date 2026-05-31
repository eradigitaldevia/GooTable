import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useTurnoAtivo } from "@/hooks/use-caixa";
import { AbrirCaixaCard } from "@/components/admin/caixa/abrir-caixa-card";
import { TurnoAbertoPainel } from "@/components/admin/caixa/turno-aberto-painel";

export const Route = createFileRoute("/_authenticated/caixa/")({
  component: CaixaIndexPage,
});

function CaixaIndexPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: turno, isLoading } = useTurnoAtivo(restaurante?.id);

  if (!restaurante) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Caixa</h1>
        <p className="text-sm text-muted-foreground">
          Abertura, conferência e fechamento do turno.
        </p>
      </div>
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
    </div>
  );
}