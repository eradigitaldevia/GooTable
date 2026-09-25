import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useTick } from "@/hooks/use-tick";
import { queryKeys } from "@/lib/query-keys";
import { usePedidosDoDia } from "@/hooks/use-pedidos";
import { useMarcarItemUnidades } from "@/hooks/use-kds-item";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";

import { BarHeader } from "@/components/bar/bar-header";
import { BarItemRow, type BarItem } from "@/components/bar/bar-item-row";
import { BarEmptyState } from "@/components/bar/bar-empty-state";
import { KdsConnectionBanner } from "@/components/cozinha/kds-connection-banner";
import { ComandaPreparo } from "@/components/impressao/comanda-preparo";
import { useImpressaoAuto, type PedidoImpressao } from "@/hooks/use-impressao-auto";

export const Route = createFileRoute("/_authenticated/bar")({
  component: BarPanel,
});

interface Pedido {
  id: string;
  status: "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";
  criado_em: string;
  mesa_id: string;
  canal?: string | null;
}
interface ItemRaw extends BarItem {
  pedido_id: string;
  destino?: "cozinha" | "bar";
}
interface Mesa {
  id: string;
  numero: string;
}

function BarPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: restaurante, isLoading: loadingRest } = useMeuRestaurante(user?.id);
  const restauranteId = restaurante?.id ?? null;

  const [filtro, setFiltro] = useState<"pendentes" | "em_preparo" | "todos">("pendentes");

  useTick(30_000);

  const marcarItemMut = useMarcarItemUnidades(restauranteId ?? undefined);

  // Realtime
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleInvalidate = useCallback(() => {
    if (!restauranteId) return;
    if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
    invalidateTimeoutRef.current = setTimeout(() => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
      invalidateTimeoutRef.current = null;
    }, 800);
  }, [qc, restauranteId]);
  useEffect(() => () => {
    if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
  }, []);

  const setupChannel = useCallback(
    (channel: import("@supabase/supabase-js").RealtimeChannel) =>
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedidos", filter: `restaurante_id=eq.${restauranteId}` },
          () => scheduleInvalidate(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedido_itens" },
          () => scheduleInvalidate(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedido_destino_status" },
          () => scheduleInvalidate(),
        ),
    [restauranteId, scheduleInvalidate],
  );

  const onReconnect = useCallback(() => {
    if (restauranteId) {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
    }
  }, [qc, restauranteId]);

  const { status: rtStatus, reconnect: rtReconnect } = useRealtimeStatus({
    channelName: `bar-${restauranteId ?? "none"}`,
    enabled: !!restauranteId,
    setup: setupChannel,
    onReconnect,
  });

  const { data, isLoading } = usePedidosDoDia(restauranteId ?? undefined, {
    refetchInterval: rtStatus === "connected" ? false : 15_000,
  });

  const pedidos = (data?.pedidos ?? []) as Pedido[];
  const pedidoMap = useMemo(() => {
    const m = new Map<string, Pedido>();
    for (const p of pedidos) m.set(p.id, p);
    return m;
  }, [pedidos]);

  const mesas = useMemo(() => {
    const m = new Map<string, Mesa>();
    for (const x of (data?.mesas ?? []) as Mesa[]) m.set(x.id, x);
    return m;
  }, [data?.mesas]);

  const itensRaw = (data?.itens ?? []) as ItemRaw[];

  // Apenas itens do Bar, e cujo pedido está ativo
  const itensBar = useMemo(
    () =>
      itensRaw.filter((it) => {
        if ((it.destino ?? "cozinha") !== "bar") return false;
        const p = pedidoMap.get(it.pedido_id);
        if (!p) return false;
        return p.status !== "cancelado" && p.status !== "entregue";
      }),
    [itensRaw, pedidoMap],
  );

  // Impressão automática de comandas de preparo (configurável pelo admin).
  const impressaoAutoLigada = restaurante?.impressao_auto_bar === true;
  const pedidosImpressao = useMemo<PedidoImpressao[]>(() => {
    const porPedido = new Map<string, ItemRaw[]>();
    for (const it of itensRaw) {
      if ((it.destino ?? "cozinha") !== "bar") continue;
      if (!porPedido.has(it.pedido_id)) porPedido.set(it.pedido_id, []);
      porPedido.get(it.pedido_id)!.push(it);
    }
    return Array.from(porPedido.entries()).map(([pedidoId, lista]) => {
      const p = pedidoMap.get(pedidoId);
      return {
        pedidoId,
        mesaNumero: p ? mesas.get(p.mesa_id)?.numero ?? null : null,
        canal: p?.canal ?? null,
        criadoEm: p?.criado_em ?? null,
        cancelado: p?.status === "cancelado",
        itens: lista.map((it) => ({
          id: it.id,
          nome: it.nome_produto,
          quantidade: it.quantidade,
          observacao: it.observacao,
        })),
      };
    });
  }, [itensRaw, pedidoMap, mesas]);
  const { jobAtual } = useImpressaoAuto({
    enabled: impressaoAutoLigada,
    destino: "bar",
    restauranteId,
    pedidos: pedidosImpressao,
    carregado: !isLoading,
  });


  const pendentesCount = itensBar.filter((i) => i.status === "pendente").length;
  const emPreparoCount = itensBar.filter((i) => i.status === "em_preparo").length;
  const prontosHojeCount = itensRaw.filter(
    (it) => (it.destino ?? "cozinha") === "bar" && it.status === "pronto",
  ).length;

  const itensFiltrados = useMemo(() => {
    let list = itensBar;
    if (filtro === "pendentes") list = list.filter((i) => i.status === "pendente");
    if (filtro === "em_preparo") list = list.filter((i) => i.status === "em_preparo");
    // Ordenar: mais antigos primeiro
    return [...list].sort((a, b) => {
      const pa = pedidoMap.get(a.pedido_id);
      const pb = pedidoMap.get(b.pedido_id);
      return new Date(pa?.criado_em ?? 0).getTime() - new Date(pb?.criado_em ?? 0).getTime();
    });
  }, [itensBar, filtro, pedidoMap]);

  const marcar = async (itemId: string, quantidadePronta: number) => {
    try {
      await marcarItemMut.mutateAsync({ itemId, quantidadePronta });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar item");
    }
  };

  if (loadingRest || !restauranteId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <BarHeader
        pendentes={pendentesCount}
        emPreparo={emPreparoCount}
        prontosHoje={prontosHojeCount}
        filtro={filtro}
        onFiltroChange={setFiltro}
        impressaoAuto={impressaoAutoLigada}
      />

      {jobAtual && <ComandaPreparo {...jobAtual} />}

      <KdsConnectionBanner
        status={rtStatus}
        onReconnect={rtReconnect}
        onReload={() => window.location.reload()}
      />

      <main className="flex-1 overflow-auto p-3 md:p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Carregando…</div>
        ) : itensFiltrados.length === 0 ? (
          <BarEmptyState filtro={filtro} />
        ) : (
          <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-sm">
            {itensFiltrados.map((it) => {
              const p = pedidoMap.get(it.pedido_id);
              const mesaNumero = p ? mesas.get(p.mesa_id)?.numero ?? "?" : "?";
              const pending =
                marcarItemMut.isPending && marcarItemMut.variables?.itemId === it.id;
              return (
                <BarItemRow
                  key={it.id}
                  item={it}
                  mesa={mesaNumero}
                  criadoEm={p?.criado_em ?? new Date().toISOString()}
                  pending={pending}
                  onMarcarTodas={() =>
                    marcar(it.id, it.status === "pronto" ? 0 : it.quantidade)
                  }
                  onDecrementar={() => marcar(it.id, Math.max(0, it.quantidade_pronta - 1))}
                  canal={p?.canal}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}