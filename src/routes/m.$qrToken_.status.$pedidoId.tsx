import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/cliente/status-timeline";
import { StatusTimelineSkeleton } from "@/components/cliente/skeletons/status-timeline-skeleton";
import { ItensPedido } from "@/components/cliente/itens-pedido";
import { PixPanel } from "@/components/cliente/pix-panel";
import { RefeicaoTimeline } from "@/components/cliente/refeicao-timeline";
import { CarrinhoPersistente } from "@/components/cliente/carrinho-persistente";
import { ChamarGarcomFab } from "@/components/cliente/chamar-garcom-fab";
import { carregarStatusPedidoPublicoFn } from "@/lib/status-pedido-publico.functions";
import { useClienteMesa } from "@/hooks/use-cliente-mesa";
import { usePedidosComanda } from "@/hooks/use-pedidos-comanda";
import { useRealtimePedidoPublico } from "@/hooks/use-realtime";
import { useNotificarPedidoPronto } from "@/hooks/use-notificar-pedido-pronto";

export const Route = createFileRoute("/m/$qrToken_/status/$pedidoId")({
  component: Status,
});

function Status() {
  const { qrToken, pedidoId } = Route.useParams();
  const { identidade } = useClienteMesa(qrToken);
  const fn = useServerFn(carregarStatusPedidoPublicoFn);
  const { data, isLoading } = useQuery({
    queryKey: ["status-pedido-publico", qrToken, pedidoId],
    queryFn: () => fn({ data: { qrToken, pedidoId } }),
  });

  useRealtimePedidoPublico(qrToken, pedidoId, identidade?.comandaId);
  useNotificarPedidoPronto(pedidoId, data?.pedido?.status);

  const { data: pedidosComanda } = usePedidosComanda(qrToken, identidade?.comandaId);

  if (isLoading) {
    return <StatusTimelineSkeleton />;
  }

  if (!data || data.erro || !data.pedido) {
    return (
      <div className="p-8 text-center">{data?.erro ?? "Pedido não encontrado."}</div>
    );
  }

  const { pedido, itens, restaurante } = data;

  if (pedido.status === "cancelado") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-destructive">Pedido cancelado</h1>
        <Link to="/m/$qrToken" params={{ qrToken }} className="mt-4">
          <Button>Voltar ao cardápio</Button>
        </Link>
      </div>
    );
  }

  const pixOn = !!restaurante.pix_habilitado && !!restaurante.pix_chave;
  const lista =
    pedidosComanda && !("erro" in pedidosComanda) ? pedidosComanda.pedidos ?? [] : [];

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b bg-card px-4 py-5">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pedido</p>
          <h1 className="text-2xl font-bold">#{pedido.id.slice(0, 8)}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <StatusTimeline status={pedido.status} />

        <ItensPedido
          itens={itens}
          total={Number(pedido.total)}
          cancelContext={{ qrToken, pedidoId, comandaId: identidade?.comandaId }}
        />

        {lista.length > 1 && (
          <RefeicaoTimeline qrToken={qrToken} pedidos={lista} atualId={pedidoId} />
        )}

        {pixOn && (
          <PixPanel
            chave={restaurante.pix_chave!}
            titular={restaurante.pix_nome_titular || restaurante.nome}
            valor={Number(pedido.total)}
            descricao={`Pedido ${pedido.id.slice(0, 8)}`}
          />
        )}

        <Link to="/m/$qrToken" params={{ qrToken }} className="block">
          <Button variant="outline" className="w-full h-12 rounded-2xl">
            Adicionar mais itens
          </Button>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/m/$qrToken/conta" params={{ qrToken }} className="block">
            <Button variant="outline" className="w-full h-12 rounded-2xl">
              Conta da mesa
            </Button>
          </Link>
          <Link to="/m/$qrToken/minha-conta" params={{ qrToken }} className="block">
            <Button variant="outline" className="w-full h-12 rounded-2xl">
              Minha conta
            </Button>
          </Link>
        </div>
      </main>

      <CarrinhoPersistente qrToken={qrToken} />

      {identidade && (
        <ChamarGarcomFab
          qrToken={qrToken}
          comandaId={identidade.comandaId}
          sessaoId={identidade.sessaoId}
          clienteId={identidade.clienteId}
          bottomOffset
        />
      )}
    </div>
  );
}
