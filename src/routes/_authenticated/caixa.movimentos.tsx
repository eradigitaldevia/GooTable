import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useTurnoAtivo } from "@/hooks/use-caixa";
import { MovimentosPanel } from "@/components/admin/caixa/movimentos-panel";

export const Route = createFileRoute("/_authenticated/caixa/movimentos")({
  component: CaixaMovimentosPage,
});

function CaixaMovimentosPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: turno } = useTurnoAtivo(restaurante?.id);

  if (!restaurante) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Movimentos</h1>
        <p className="text-sm text-muted-foreground">
          Sangrias (retiradas) e suprimentos (entradas) no caixa do turno.
        </p>
      </div>
      <MovimentosPanel restauranteId={restaurante.id} turno={turno ?? null} />
    </div>
  );
}