import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import {
  alterarMesaAtivaFn,
  criarMesaFn,
  excluirMesaFn,
  listarMesasFn,
} from "@/lib/mesas.functions";

export function useMesas(restauranteId: string | undefined) {
  const fn = useServerFn(listarMesasFn);
  return useQuery({
    queryKey: restauranteId ? queryKeys.mesas(restauranteId) : ["mesas", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

function useInvalidateMesas(restauranteId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    if (!restauranteId) return;
    qc.invalidateQueries({ queryKey: queryKeys.mesas(restauranteId) });
  };
}

export function useCriarMesa(restauranteId: string | undefined) {
  const fn = useServerFn(criarMesaFn);
  const invalidate = useInvalidateMesas(restauranteId);
  return useMutation({
    mutationFn: (data: { numero: string }) =>
      fn({ data: { restauranteId: restauranteId!, numero: data.numero } }),
    onSuccess: invalidate,
  });
}

export function useAlterarMesaAtiva(restauranteId: string | undefined) {
  const fn = useServerFn(alterarMesaAtivaFn);
  const invalidate = useInvalidateMesas(restauranteId);
  return useMutation({
    mutationFn: (data: { id: string; ativa: boolean }) =>
      fn({ data: { id: data.id, ativa: data.ativa, restauranteId: restauranteId! } }),
    onSuccess: invalidate,
  });
}

export function useExcluirMesa(restauranteId: string | undefined) {
  const fn = useServerFn(excluirMesaFn);
  const invalidate = useInvalidateMesas(restauranteId);
  return useMutation({
    mutationFn: (data: { id: string }) =>
      fn({ data: { id: data.id, restauranteId: restauranteId! } }),
    onSuccess: invalidate,
  });
}

/**
 * Inscreve em mudanças de mesa_sessoes, pedidos e comandas do restaurante,
 * invalidando a query de mesas (com debounce) para o grid refletir o estado
 * das mesas em tempo real.
 */
export function useRealtimeMesas(restauranteId: string | undefined) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!restauranteId) return;
    const invalidate = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.mesas(restauranteId) });
      }, 400);
    };

    const channel = supabase
      .channel(`mesas-realtime-${restauranteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mesa_sessoes",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comandas",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc]);
}
