import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  atenderChamadoFn,
  atualizarTipoChamadoFn,
  criarTipoChamadoFn,
  excluirTipoChamadoFn,
  listarChamadosFn,
  listarTiposChamadoFn,
  metricasChamadosFn,
} from "@/lib/chamados.functions";

const keys = {
  tipos: (rid: string) => ["tipos-chamado", rid] as const,
  chamados: (rid: string, pend?: boolean) => ["chamados", rid, pend ?? false] as const,
  metricas: (rid: string) => ["metricas-chamados", rid] as const,
  pendentes: (rid: string) => ["chamados-pendentes-count", rid] as const,
};

export function useTiposChamado(restauranteId: string | undefined) {
  const fn = useServerFn(listarTiposChamadoFn);
  return useQuery({
    queryKey: restauranteId ? keys.tipos(restauranteId) : ["tipos-chamado", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useCriarTipoChamado(restauranteId: string | undefined) {
  const qc = useQueryClient();
  const fn = useServerFn(criarTipoChamadoFn);
  return useMutation({
    mutationFn: (input: { nome: string; icone: string; ordem?: number; ativo?: boolean }) =>
      fn({ data: { restauranteId: restauranteId!, input } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: keys.tipos(restauranteId) });
    },
  });
}

export function useAtualizarTipoChamado(restauranteId: string | undefined) {
  const qc = useQueryClient();
  const fn = useServerFn(atualizarTipoChamadoFn);
  return useMutation({
    mutationFn: (vars: {
      tipoId: string;
      input: { nome: string; icone: string; ordem?: number; ativo?: boolean };
    }) => fn({ data: { restauranteId: restauranteId!, ...vars } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: keys.tipos(restauranteId) });
    },
  });
}

export function useExcluirTipoChamado(restauranteId: string | undefined) {
  const qc = useQueryClient();
  const fn = useServerFn(excluirTipoChamadoFn);
  return useMutation({
    mutationFn: (tipoId: string) => fn({ data: { restauranteId: restauranteId!, tipoId } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: keys.tipos(restauranteId) });
    },
  });
}

export function useChamados(restauranteId: string | undefined, apenasPendentes?: boolean) {
  const fn = useServerFn(listarChamadosFn);
  return useQuery({
    queryKey: restauranteId
      ? keys.chamados(restauranteId, apenasPendentes)
      : ["chamados", "none"],
    queryFn: () =>
      fn({ data: { restauranteId: restauranteId!, apenasPendentes } }),
    enabled: !!restauranteId,
  });
}

export function useMetricasChamados(restauranteId: string | undefined) {
  const fn = useServerFn(metricasChamadosFn);
  return useQuery({
    queryKey: restauranteId ? keys.metricas(restauranteId) : ["metricas-chamados", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useAtenderChamado(restauranteId: string | undefined) {
  const qc = useQueryClient();
  const fn = useServerFn(atenderChamadoFn);
  return useMutation({
    mutationFn: (chamadoId: string) =>
      fn({ data: { restauranteId: restauranteId!, chamadoId } }),
    onSuccess: () => {
      if (restauranteId) {
        qc.invalidateQueries({ queryKey: ["chamados", restauranteId] });
        qc.invalidateQueries({ queryKey: keys.metricas(restauranteId) });
      }
    },
  });
}

/** Realtime: invalida queries de chamados quando algo muda. */
export function useRealtimeChamados(restauranteId: string | undefined) {
  const qc = useQueryClient();
  const instanceId = useId();
  useEffect(() => {
    if (!restauranteId) return;
    const channel = supabase
      .channel(`rt-chamados-${restauranteId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chamados_garcom",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["chamados", restauranteId] });
          qc.invalidateQueries({ queryKey: keys.metricas(restauranteId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc, instanceId]);
}
