import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChefHat, Bell, PackageCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeaderSkeleton } from "@/components/admin/skeletons/page-header-skeleton";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";
import { toast } from "sonner";
import { PedidosKanban } from "@/components/pedidos/pedidos-kanban";
import { DetalhePedido } from "@/components/pedidos/detalhe-pedido";
import { usePedidosDoDia } from "@/hooks/use-pedidos";
import { queryKeys } from "@/lib/query-keys";
import { listarPedidosDoDiaFn } from "@/lib/pedidos.functions";
import { useGarcomLookup } from "@/hooks/use-garcom-lookup";
import { AbaHistorico } from "@/components/pedidos/aba-historico";
import { AbaEmAberto } from "@/components/pedidos/aba-em-aberto";
import { AbaCancelados } from "@/components/pedidos/aba-cancelados";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  loader: ({ context }) => {
    const { queryClient, restauranteId } = context as {
      queryClient: import("@tanstack/react-query").QueryClient;
      restauranteId?: string;
    };
    if (restauranteId) {
      queryClient.ensureQueryData({
        queryKey: queryKeys.pedidos(restauranteId),
        queryFn: () => listarPedidosDoDiaFn({ data: { restauranteId } }),
      });
    }
  },
  component: PedidosPainel,
});

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

interface Pedido {
  id: string;
  status: StatusPedido;
  total: number;
  observacao: string | null;
  criado_em: string;
  mesa_id: string;
  restaurante_id: string;
  comanda_id: string | null;
  garcom_id?: string | null;
  canal?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  taxa_entrega?: number | null;
  endereco_cep?: string | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_referencia?: string | null;
}
interface Item {
  id: string;
  pedido_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
  quantidade_pronta?: number;
}
interface Mesa { id: string; numero: string; }

const COLUNAS: { key: StatusPedido; label: string; icon: any; next?: StatusPedido }[] = [
  { key: "recebido", label: "Recebido", icon: Clock },
  { key: "em_preparo", label: "Em preparo", icon: ChefHat },
  { key: "pronto", label: "Pronto", icon: Bell },
  { key: "entregue", label: "Entregue", icon: PackageCheck },
];

function PedidosPainel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const restauranteId = restaurante?.id ?? null;
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const [filtroCanal, setFiltroCanal] = useState<"todos" | "mesa" | "delivery" | "retirada">("todos");

  const { data, isLoading } = usePedidosDoDia(restauranteId ?? undefined);
  const { nomeDoPedido } = useGarcomLookup(restauranteId ?? undefined);

  const pedidosAll = (data?.pedidos ?? []) as Pedido[];
  const pedidos = useMemo(
    () =>
      filtroCanal === "todos"
        ? pedidosAll
        : pedidosAll.filter((p) => (p.canal ?? "mesa") === filtroCanal),
    [pedidosAll, filtroCanal],
  );
  const contagensCanal = useMemo(() => {
    const c = { mesa: 0, delivery: 0, retirada: 0 };
    for (const p of pedidosAll) {
      const k = (p.canal ?? "mesa") as keyof typeof c;
      if (k in c) c[k]++;
    }
    return c;
  }, [pedidosAll]);
  const itens = (data?.itens ?? []) as Item[];
  const destinoStatusList = (data?.destinoStatus ?? []) as Array<{
    pedido_id: string;
    destino: "cozinha" | "bar";
    status: StatusPedido;
  }>;
  const mesas = useMemo(() => {
    const m = new Map<string, Mesa>();
    for (const x of (data?.mesas ?? []) as Mesa[]) m.set(x.id, x);
    return m;
  }, [data?.mesas]);

  // Mantém referência atualizada de `mesas` sem reassinar o canal a cada refetch.
  const mesasRef = useRef(mesas);
  useEffect(() => {
    mesasRef.current = mesas;
  }, [mesas]);

  // Realtime: invalida a query (com debounce) e dispara toast/beep no INSERT.
  useEffect(() => {
    if (!restauranteId) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
        timeout = null;
      }, 1500);
    };
    const channel = supabase
      .channel(`admin-pedidos-${restauranteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `restaurante_id=eq.${restauranteId}` },
        (payload) => {
          scheduleInvalidate();
          if (payload.eventType === "INSERT") {
            const novo = payload.new as Pedido;
            toast.success(`Novo pedido — Mesa ${mesasRef.current.get(novo.mesa_id)?.numero ?? "?"}`);
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.frequency.value = 880;
              g.gain.setValueAtTime(0.15, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
              o.start();
              o.stop(ctx.currentTime + 0.4);
            } catch {}
          }
        },
      )
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc]);

  const itensPorPedido = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of itens) {
      if (!m.has(it.pedido_id)) m.set(it.pedido_id, []);
      m.get(it.pedido_id)!.push(it);
    }
    return m;
  }, [itens]);

  const destinoStatusPorPedido = useMemo(() => {
    const m = new Map<string, { destino: "cozinha" | "bar"; status: StatusPedido }[]>();
    for (const d of destinoStatusList) {
      if (!m.has(d.pedido_id)) m.set(d.pedido_id, []);
      m.get(d.pedido_id)!.push({ destino: d.destino, status: d.status });
    }
    return m;
  }, [destinoStatusList]);

  if (isLoading || !restauranteId) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <CardsGridSkeleton count={4} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel operacional do dia, histórico, auditoria de pedidos esquecidos e cancelados.
        </p>
      </header>

      <Tabs defaultValue="hoje" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="em-aberto">Em aberto (auditoria)</TabsTrigger>
          <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Hoje · {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Pedidos criados hoje. Para dias anteriores, use a aba Histórico.
            </span>
          </div>

          <Tabs value={filtroCanal} onValueChange={(v) => setFiltroCanal(v as typeof filtroCanal)}>
            <TabsList>
              <TabsTrigger value="todos">Todos ({pedidosAll.length})</TabsTrigger>
              <TabsTrigger value="mesa">Salão ({contagensCanal.mesa})</TabsTrigger>
              <TabsTrigger value="delivery">Delivery ({contagensCanal.delivery})</TabsTrigger>
              <TabsTrigger value="retirada">Retirada ({contagensCanal.retirada})</TabsTrigger>
            </TabsList>
          </Tabs>

          <PedidosKanban
            colunas={COLUNAS}
            pedidos={pedidos}
            itensPorPedido={itensPorPedido}
            mesas={mesas}
            onAbrir={setAberto}
            onAvancar={() => {}}
            garcomPorPedido={(p) => nomeDoPedido(p)}
            destinoStatusPorPedido={destinoStatusPorPedido}
          />

          <DetalhePedido
            pedido={aberto}
            itens={aberto ? itensPorPedido.get(aberto.id) ?? [] : []}
            mesa={aberto ? mesas.get(aberto.mesa_id)?.numero : undefined}
            garcomNome={aberto ? nomeDoPedido(aberto) : null}
            destinoStatus={
              aberto
                ? destinoStatusList
                    .filter((d) => d.pedido_id === aberto.id)
                    .map((d) => ({ destino: d.destino, status: d.status }))
                : []
            }
            onClose={() => setAberto(null)}
            deliverySlug={restaurante?.delivery_slug ?? null}
          />
        </TabsContent>

        <TabsContent value="historico">
          <AbaHistorico restauranteId={restauranteId} deliverySlug={restaurante?.delivery_slug ?? null} />
        </TabsContent>

        <TabsContent value="em-aberto">
          <AbaEmAberto restauranteId={restauranteId} deliverySlug={restaurante?.delivery_slug ?? null} />
        </TabsContent>

        <TabsContent value="cancelados">
          <AbaCancelados restauranteId={restauranteId} deliverySlug={restaurante?.delivery_slug ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
