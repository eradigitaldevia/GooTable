import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCuponsFn,
  criarCupomFn,
  atualizarCupomFn,
  excluirCupomFn,
  aplicarCupomComandaFn,
  removerCupomComandaFn,
  type CupomInput,
} from "@/lib/cupons.functions";

const key = (restauranteId: string) => ["cupons", restauranteId] as const;

export function useCupons(restauranteId: string | undefined) {
  const fn = useServerFn(listarCuponsFn);
  return useQuery({
    queryKey: restauranteId ? key(restauranteId) : ["cupons", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useCriarCupom(restauranteId: string | undefined) {
  const fn = useServerFn(criarCupomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CupomInput) => fn({ data: { restauranteId: restauranteId!, input } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: key(restauranteId) });
    },
  });
}

export function useAtualizarCupom(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarCupomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { cupomId: string; input: CupomInput }) =>
      fn({ data: { restauranteId: restauranteId!, cupomId: vars.cupomId, input: vars.input } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: key(restauranteId) });
    },
  });
}

export function useExcluirCupom(restauranteId: string | undefined) {
  const fn = useServerFn(excluirCupomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cupomId: string) => fn({ data: { restauranteId: restauranteId!, cupomId } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: key(restauranteId) });
    },
  });
}

export function useAplicarCupomComanda(qrToken: string) {
  const fn = useServerFn(aplicarCupomComandaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { comandaId: string; codigo: string; clienteId?: string | null }) =>
      fn({
        data: {
          qrToken,
          comandaId: vars.comandaId,
          codigo: vars.codigo,
          clienteId: vars.clienteId ?? null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumo-conta"] });
    },
  });
}

export function useRemoverCupomComanda(qrToken: string) {
  const fn = useServerFn(removerCupomComandaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comandaId: string) => fn({ data: { qrToken, comandaId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumo-conta"] });
    },
  });
}
