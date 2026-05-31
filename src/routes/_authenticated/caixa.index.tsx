import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useTurnoAtivo } from "@/hooks/use-caixa";
import { useMeuPapel } from "@/hooks/use-equipe";
import { useVerificarPlatformAdmin } from "@/hooks/use-superadmin";
import { AbrirCaixaCard } from "@/components/admin/caixa/abrir-caixa-card";
import { TurnoAbertoPainel } from "@/components/admin/caixa/turno-aberto-painel";

export const Route = createFileRoute("/_authenticated/caixa/")({
  component: CaixaIndexPage,
});

function CaixaIndexPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: turno, isLoading } = useTurnoAtivo(restaurante?.id);
  const { data: papelData } = useMeuPapel();
  const { data: paData } = useVerificarPlatformAdmin();

  if (!restaurante) return null;

  const papel = papelData?.papel ?? null;
  const isPlatformAdmin = !!paData?.isPlatformAdmin;
  const souDono = !!(turno && user && turno.operador_user_id === user.id);
  const podeAssumir = !!turno && !souDono && papel === "admin" && !isPlatformAdmin;

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
        <TurnoAbertoPainel
          restauranteId={restaurante.id}
          turno={turno}
          souDono={souDono}
          podeAssumir={podeAssumir}
          meuNomeSugerido={user?.email ?? null}
          conferenciaCega={!!restaurante.caixa_conferencia_cega}
        />
      ) : (
        <AbrirCaixaCard
          restauranteId={restaurante.id}
          operadorPadrao={user?.email ?? undefined}
          bloquearOperador
        />
      )}
    </div>
  );
}