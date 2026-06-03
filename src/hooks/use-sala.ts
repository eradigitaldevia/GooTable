import { useEffect, useId, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  carregarSalaFn,
  carregarSalaAdminFn,
  listarMesasRestauranteFn,
  abrirTurnoGarcomFn,
  encerrarTurnoGarcomFn,
  listarGarconsOnlineFn,
  type SalaDados,
  type MesaRestauranteInfo,
  type GarcomOnline,
} from "@/lib/sala.functions";
import { atualizarStatusPedidoFn } from "@/lib/pedidos.functions";
import { atenderChamadoFn } from "@/lib/chamados.functions";

export const SALA_KEY = ["sala-dados"] as const;
export const SALA_ADMIN_KEY = (garcomId: string) =>
  ["sala-admin", garcomId] as const;

export function useSalaDados() {
  const fn = useServerFn(carregarSalaFn);
  return useQuery<SalaDados | null>({
    queryKey: SALA_KEY,
    queryFn: () => fn({} as never),
  });
}

export function useSalaAdmin(garcomId: string) {
  const fn = useServerFn(carregarSalaAdminFn);
  return useQuery<SalaDados | null>({
    queryKey: SALA_ADMIN_KEY(garcomId),
    queryFn: () => fn({ data: { garcomId } }),
    enabled: !!garcomId,
  });
}

export function useMesasRestaurante(
  restauranteId: string | undefined,
  enabled: boolean,
) {
  const fn = useServerFn(listarMesasRestauranteFn);
  return useQuery<MesaRestauranteInfo[]>({
    queryKey: ["sala-mesas-restaurante", restauranteId ?? "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId && enabled,
  });
}

export function useConfirmarEntregaSala(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarStatusPedidoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pedidoId: string) =>
      fn({
        data: { id: pedidoId, restauranteId: restauranteId!, status: "entregue" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SALA_KEY });
    },
  });
}

export function useAtenderChamadoSala(restauranteId: string | undefined) {
  const fn = useServerFn(atenderChamadoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chamadoId: string) =>
      fn({ data: { restauranteId: restauranteId!, chamadoId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SALA_KEY });
    },
  });
}

export function useAbrirTurno() {
  const fn = useServerFn(abrirTurnoGarcomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (garcomId: string) => fn({ data: { garcomId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SALA_KEY });
      qc.invalidateQueries({ queryKey: ["garcons-online"] });
    },
  });
}

export function useEncerrarTurno() {
  const fn = useServerFn(encerrarTurnoGarcomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (garcomId: string) => fn({ data: { garcomId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SALA_KEY });
      qc.invalidateQueries({ queryKey: ["garcons-online"] });
    },
  });
}

export function useGarconsOnline(restauranteId: string | undefined) {
  const fn = useServerFn(listarGarconsOnlineFn);
  return useQuery<GarcomOnline[]>({
    queryKey: ["garcons-online", restauranteId ?? "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
    refetchInterval: 60_000,
  });
}

/** Beep curto via WebAudio. Silencioso se contexto não disponível. */
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

/** Realtime: invalida sala + toca sons quando entra pedido pronto ou chamado novo. */
export function useRealtimeSala(
  restauranteId: string | undefined,
  mesaIds: string[],
  queryKey: QueryKey = SALA_KEY,
) {
  const qc = useQueryClient();
  const instanceId = useId();
  const mesaSetRef = useRef<Set<string>>(new Set());
  const keyRef = useRef<QueryKey>(queryKey);
  useEffect(() => {
    keyRef.current = queryKey;
  }, [queryKey]);
  useEffect(() => {
    mesaSetRef.current = new Set(mesaIds);
  }, [mesaIds]);

  useEffect(() => {
    if (!restauranteId) return;
    const channel = supabase
      .channel(`rt-sala-${restauranteId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        (payload) => {
          const rec = (payload.new ?? payload.old) as
            | { mesa_id?: string; status?: string }
            | null;
          if (rec?.mesa_id && !mesaSetRef.current.has(rec.mesa_id)) return;
          const novo = payload.new as { status?: string } | null;
          const antigo = payload.old as { status?: string } | null;
          if (
            novo?.status === "pronto" &&
            antigo?.status !== "pronto"
          ) {
            playBeep(880);
          }
          qc.invalidateQueries({ queryKey: keyRef.current });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chamados_garcom",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        (payload) => {
          const rec = (payload.new ?? payload.old) as
            | { mesa_id?: string; status?: string }
            | null;
          if (rec?.mesa_id && !mesaSetRef.current.has(rec.mesa_id)) return;
          if (payload.eventType === "INSERT") {
            playBeep(660);
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