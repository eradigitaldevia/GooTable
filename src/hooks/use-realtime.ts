import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Realtime: pedidos + pedido_itens de um restaurante.
 * Invalida cache do React Query quando algo muda.
 */
export function useRealtimePedidos(restauranteId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!restauranteId) return;

    const channel = supabase
      .channel(`rt-pedidos-${restauranteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
          const id =
            (payload.new as { id?: string } | null)?.id ??
            (payload.old as { id?: string } | null)?.id;
          if (id) qc.invalidateQueries({ queryKey: queryKeys.pedido(id) });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedido_itens",
        },
        (payload) => {
          const id =
            (payload.new as { pedido_id?: string } | null)?.pedido_id ??
            (payload.old as { pedido_id?: string } | null)?.pedido_id;
          qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
          if (id) qc.invalidateQueries({ queryKey: queryKeys.pedido(id) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc]);
}

/**
 * Realtime para um pedido específico (tela de status do cliente).
 */
export function useRealtimePedido(pedidoId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!pedidoId) return;

    const channel = supabase
      .channel(`rt-pedido-${pedidoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `id=eq.${pedidoId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.pedido(pedidoId) });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedido_itens",
          filter: `pedido_id=eq.${pedidoId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.pedido(pedidoId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoId, qc]);
}

/**
 * Realtime da mesa atual (conta + clientes ativos na sessão).
 * Filtra por sessao_id; invalida queries da rota pública do qrToken.
 */
export function useRealtimeMesa(qrToken: string | undefined, sessaoId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!qrToken || !sessaoId) return;

    const channel = supabase
      .channel(`rt-mesa-${sessaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comandas",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["resumo-conta", qrToken] });
          qc.invalidateQueries({ queryKey: ["minha-conta", qrToken] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mesa_sessao_clientes",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["resumo-conta", qrToken] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["resumo-conta", qrToken] });
          qc.invalidateQueries({ queryKey: ["minha-conta", qrToken] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qrToken, sessaoId, qc]);
}

/**
 * Realtime da lista de clientes do admin.
 */
export function useRealtimeClientes(restauranteId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!restauranteId) return;

    const channel = supabase
      .channel(`rt-clientes-${restauranteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clientes",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["admin-clientes", restauranteId] });
          const id =
            (payload.new as { id?: string } | null)?.id ??
            (payload.old as { id?: string } | null)?.id;
          if (id) {
            qc.invalidateQueries({ queryKey: ["admin-cliente", restauranteId, id] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc]);
}
