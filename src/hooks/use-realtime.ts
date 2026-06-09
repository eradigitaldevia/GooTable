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
 * Realtime para um pedido público do cliente: ouve mudanças em
 * pedidos (por id) e pedido_itens (por pedido_id) e invalida o cache
 * da tela de status. Também invalida a lista de pedidos da comanda.
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
 * Realtime para a tela de status pública (cliente).
 * Filtra eventos por pedido_id (e por id em pedidos).
 */
export function useRealtimePedidoPublico(
  qrToken: string | undefined,
  pedidoId: string | undefined,
  comandaId?: string | null,
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!qrToken || !pedidoId) return;

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["status-pedido-publico", qrToken, pedidoId] });
      if (comandaId) {
        qc.invalidateQueries({ queryKey: ["pedidos-comanda", qrToken, comandaId] });
      }
    };

    const channel = supabase
      .channel(`rt-status-pub-${pedidoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `id=eq.${pedidoId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedido_itens",
          filter: `pedido_id=eq.${pedidoId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qrToken, pedidoId, comandaId, qc]);
}

/**
 * Realtime da mesa atual (conta + clientes ativos na sessão).
 * Ouve mudanças em pedidos/pedido_itens filtrados pela sessão.
 */
export function useRealtimeMesa(qrToken: string | undefined, sessaoId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!qrToken || !sessaoId) return;

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["resumo-conta", qrToken] });
      qc.invalidateQueries({ queryKey: ["minha-conta", qrToken] });
    };

    const channel = supabase
      .channel(`rt-mesa-${sessaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedido_itens",
        },
        invalidate,
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
