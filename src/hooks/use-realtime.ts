import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * Polling: invalida queries de pedidos do restaurante em intervalo fixo.
 * (Substitui Realtime para evitar exposição da tabela realtime.messages.)
 */
export function useRealtimePedidos(restauranteId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!restauranteId) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
    }, 5000);
    return () => clearInterval(id);
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
 * Polling da lista de clientes do admin.
 */
export function useRealtimeClientes(restauranteId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!restauranteId) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["admin-clientes", restauranteId] });
    }, 10000);
    return () => clearInterval(id);
  }, [restauranteId, qc]);
}
