import { createFileRoute } from "@tanstack/react-router";
import { MesaDetalheView } from "@/components/sala/mesa-detalhe-view";

export const Route = createFileRoute("/_authenticated/sala_/mesa/")({
  component: MesaDetalhePage,
});

function MesaDetalhePage() {
  const { mesaId } = Route.useParams();
  return <MesaDetalheView mesaId={mesaId} backTo={{ to: "/sala" }} />;
}
