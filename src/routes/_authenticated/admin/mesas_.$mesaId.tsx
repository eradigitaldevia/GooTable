import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MesaDetalheView } from "@/components/sala/mesa-detalhe-view";

export const Route = createFileRoute("/_authenticated/admin/mesas/$mesaId")({
  component: AdminMesaDetalhePage,
});

function AdminMesaDetalhePage() {
  const { mesaId } = Route.useParams();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Eye className="h-4 w-4" />
            <span>
              Visualizando — modo <strong>somente leitura</strong>
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/mesas">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </div>
      <MesaDetalheView
        mesaId={mesaId}
        readOnly
        backTo={{ to: "/admin/mesas" }}
      />
    </div>
  );
}
