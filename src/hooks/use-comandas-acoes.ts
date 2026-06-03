import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  juntarComandasMesaFn,
  gerarDivisaoContaFn,
  sanitizarComandasOrfasFn,
} from "@/lib/cliente-mesa.functions";
import type { ModoDivisao } from "@/lib/sessoes.server";

export function useJuntarComandasMesa(
  restauranteId: string | undefined,
  mesaId?: string,
) {
  const fn = useServerFn(juntarComandasMesaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sessaoId: string;
      comandaIds: string[];
      titularClienteId: string | null;
    }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          sessaoId: data.sessaoId,
          comandaIds: data.comandaIds,
          titularClienteId: data.titularClienteId,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumo-conta-mesa", restauranteId ?? "none", mesaId ?? "none"] });
      if (restauranteId) {
        qc.invalidateQueries({ queryKey: ["pagamentos", "pendentes", restauranteId] });
        qc.invalidateQueries({ queryKey: ["pedidos", restauranteId] });
      }
    },
  });
}

export function useGerarDivisaoConta(restauranteId: string | undefined) {
  const fn = useServerFn(gerarDivisaoContaFn);
  return useMutation({
    mutationFn: (data: {
      sessaoId: string;
      comandaIds: string[];
      modo: ModoDivisao;
    }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          sessaoId: data.sessaoId,
          comandaIds: data.comandaIds,
          modo: data.modo,
        },
      }),
  });
}

export function useSanitizarComandasOrfas(restauranteId: string | undefined) {
  const fn = useServerFn(sanitizarComandasOrfasFn);
  return useMutation({
    mutationFn: (data: { sessaoId: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          sessaoId: data.sessaoId,
        },
      }),
  });
}