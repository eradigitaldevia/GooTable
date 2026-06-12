import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CumimDisplay } from "@/components/cumim/cumim-display";
import {
  useCumimAdmin,
  useRealtimeCumim,
  CUMIM_ADMIN_KEY,
} from "@/hooks/use-cumim";

export const Route = createFileRoute(
  "/_authenticated/admin/cumins_/$cumimId/display",
)({
  component: VisualizarCumimPage,
});

function VisualizarCumimPage() {
  const { cumimId } = Route.useParams();
  const { data, isLoading } = useCumimAdmin(cumimId);

  useRealtimeCumim(data?.cumim.restaurante_id, CUMIM_ADMIN_KEY(cumimId));

  const nome = data?.cumim.nome ?? "";

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Eye className="h-4 w-4" />
            <span>
              Visualizando como <strong>{nome || "cumim"}</strong> — modo
              somente leitura
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/cumim">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </div>
      <CumimDisplay dados={data} isLoading={isLoading} readOnly />
    </div>
  );
}