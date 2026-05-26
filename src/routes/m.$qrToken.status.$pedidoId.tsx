import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/cliente/status-timeline";
import { StatusTimelineSkeleton } from "@/components/cliente/skeletons/status-timeline-skeleton";
import { ItensPedido } from "@/components/cliente/itens-pedido";
import { PixPanel } from "@/components/cliente/pix-panel";

export const Route = createFileRoute("/m/$qrToken/status/$pedidoId")({
  component: Status,
});

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

interface Pedido {
  id: string;
  status: StatusPedido;
  total: number;
  observacao: string | null;
  criado_em: string;
  restaurante_id: string;
}
interface Item {
  id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
  status: "pendente" | "em_preparo" | "pronto";
  quantidade_pronta: number;
}
interface RestaurantePix {
  nome: string;
  pix_habilitado: boolean;
  pix_chave: string | null;
  pix_nome_titular: string | null;
}

function Status() {
  const { qrToken, pedidoId } = Route.useParams();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [restaurante, setRestaurante] = useState<RestaurantePix | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const carregar = async () => {
      const [{ data: p }, { data: its }] = await Promise.all([
        supabase
          .from("pedidos")
          .select("id, status, total, observacao, criado_em, restaurante_id")
          .eq("id", pedidoId)
          .maybeSingle(),
        supabase
          .from("pedido_itens")
          .select("id, nome_produto, quantidade, preco_unit, observacao, cliente_nome, status, quantidade_pronta")
          .eq("pedido_id", pedidoId),
      ]);
      if (!mounted) return;
      setPedido(p as Pedido);
      setItens((its as Item[]) ?? []);
      if (p?.restaurante_id) {
        const { data: r } = await supabase
          .from("restaurantes")
          .select("nome, pix_habilitado, pix_chave, pix_nome_titular")
          .eq("id", p.restaurante_id)
          .maybeSingle();
        if (mounted) setRestaurante(r as RestaurantePix);
      }
      setLoading(false);
    };
    carregar();

    const channel = supabase
      .channel(`pedido-${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        (payload) => {
          setPedido((prev) => (prev ? { ...prev, ...(payload.new as Pedido) } : (payload.new as Pedido)));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_itens", filter: `pedido_id=eq.${pedidoId}` },
        async () => {
          const { data: its } = await supabase
            .from("pedido_itens")
            .select("id, nome_produto, quantidade, preco_unit, observacao, cliente_nome, status, quantidade_pronta")
            .eq("pedido_id", pedidoId);
          setItens((its as Item[]) ?? []);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [pedidoId]);

  if (loading) {
    return <StatusTimelineSkeleton />;
  }

  if (!pedido) return <div className="p-8 text-center">Pedido não encontrado.</div>;

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

  const pixOn = !!restaurante?.pix_habilitado && !!restaurante.pix_chave;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-card px-4 py-5">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pedido</p>
          <h1 className="text-2xl font-bold">#{pedido.id.slice(0, 8)}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <StatusTimeline status={pedido.status} />

        <ItensPedido itens={itens} total={Number(pedido.total)} />

        {pixOn && (
          <PixPanel
            chave={restaurante!.pix_chave!}
            titular={restaurante!.pix_nome_titular || restaurante!.nome}
            valor={Number(pedido.total)}
            descricao={`Pedido ${pedido.id.slice(0, 8)}`}
          />
        )}

        <Link to="/m/$qrToken" params={{ qrToken }} className="block">
          <Button variant="outline" className="w-full h-12 rounded-2xl">
            Adicionar mais itens
          </Button>
        </Link>
      </main>
    </div>
  );
}
