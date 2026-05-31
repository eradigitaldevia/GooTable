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
 * Polling para um pedido específico (tela de status do cliente).
 */
export function useRealtimePedido(pedidoId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!pedidoId) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: queryKeys.pedido(pedidoId) });
    }, 5000);
    return () => clearInterval(id);
  }, [pedidoId, qc]);
}

/**
 * Polling da mesa atual (conta + clientes ativos na sessão).
 */
export function useRealtimeMesa(qrToken: string | undefined, sessaoId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!qrToken || !sessaoId) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["resumo-conta", qrToken] });
      qc.invalidateQueries({ queryKey: ["minha-conta", qrToken] });
    }, 5000);
    return () => clearInterval(id);
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
