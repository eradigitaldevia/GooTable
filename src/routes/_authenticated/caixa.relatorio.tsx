import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { RelatorioPanel } from "@/components/admin/caixa/relatorio-panel";

export const Route = createFileRoute("/_authenticated/caixa/relatorio")({
  component: CaixaRelatorioPage,
});

function CaixaRelatorioPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);

  if (!restaurante) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Relatório do turno</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de turnos fechados com totais, ticket médio e diferença.
        </p>
      </div>
      <RelatorioPanel restauranteId={restaurante.id} />
    </div>
  );
}