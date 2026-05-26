import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { EquipePanel } from "@/components/admin/equipe-panel";

export const Route = createFileRoute("/_authenticated/admin/equipe")({
  component: EquipePage,
});

function EquipePage() {
  const { user } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);

  if (isLoading || !restaurante) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os membros do restaurante e seus papéis de acesso.
        </p>
      </div>
      <EquipePanel restauranteId={restaurante.id} />
    </div>
  );
}