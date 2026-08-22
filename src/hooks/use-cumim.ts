import { useEffect, useId, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  carregarCumimDadosFn,
  carregarCumimAdminFn,
  confirmarEntregaCumimFn,
  type CumimDados,
} from "@/lib/cumim.functions";

export const CUMIM_KEY = ["cumim-dados"] as const;
export const CUMIM_ADMIN_KEY = (cumimId: string) =>
  ["cumim-admin", cumimId] as const;

export function useCumimDados() {
  const fn = useServerFn(carregarCumimDadosFn);
  return useQuery<CumimDados | null>({
    queryKey: CUMIM_KEY,
    queryFn: () => fn({} as never),
  });
}

export function useCumimAdmin(cumimId: string) {
  const fn = useServerFn(carregarCumimAdminFn);
  return useQuery<CumimDados | null>({
    queryKey: CUMIM_ADMIN_KEY(cumimId),
    queryFn: () => fn({ data: { cumimId } }),
    enabled: !!cumimId,
  });
}

export function useConfirmarEntregaCumim() {
  const fn = useServerFn(confirmarEntregaCumimFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pedidoId: string) => fn({ data: { pedidoId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CUMIM_KEY }),
  });
}

function playBeep(freq: number) {
  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.18;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    osc.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

/** Realtime: invalida painel do cumim quando entra pedido pronto. */
export function useRealtimeCumim(
  restauranteId: string | undefined,
  queryKey: QueryKey = CUMIM_KEY,
) {
  const qc = useQueryClient();
  const instanceId = useId();
  const keyRef = useRef<QueryKey>(queryKey);
  useEffect(() => {
    keyRef.current = queryKey;
  }, [queryKey]);

  useEffect(() => {
    if (!restauranteId) return;
    const channel = supabase
      .channel(`rt-cumim-${restauranteId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        (payload) => {
          const novo = payload.new as { status?: string } | null;
          const antigo = payload.old as { status?: string } | null;
          if (novo?.status === "pronto" && antigo?.status !== "pronto") {
            playBeep(880);
          }
          qc.invalidateQueries({ queryKey: keyRef.current });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_itens" },
        () => {
          qc.invalidateQueries({ queryKey: keyRef.current });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_destino_status" },
        (payload) => {
          const novo = payload.new as { status?: string } | null;
          const antigo = payload.old as { status?: string } | null;
          if (novo?.status === "pronto" && antigo?.status !== "pronto") {
            playBeep(880);
          }
          qc.invalidateQueries({ queryKey: keyRef.current });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc, instanceId]);
}