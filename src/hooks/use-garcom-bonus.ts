import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  atualizarMetaFn,
  calcularBonusRestauranteFn,
  criarMetaFn,
  excluirMetaFn,
  listarBonusFn,
  listarMetasFn,
  pagarBonusFn,
} from "@/lib/garcom-bonus.functions";

type MetaInput = Omit<Parameters<typeof criarMetaFn>[0]["data"], "restauranteId">;

export function useGarcomMetas(restauranteId: string | undefined) {
  const fn = useServerFn(listarMetasFn);
  return useQuery({
    queryKey: restauranteId ? queryKeys.garcomMetas(restauranteId) : ["garcom-metas", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useCriarMeta(restauranteId: string | undefined) {
  const fn = useServerFn(criarMetaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MetaInput) => fn({ data: { ...data, restauranteId: restauranteId! } }),
    onSuccess: () => {
      if (restauranteId)
        qc.invalidateQueries({ queryKey: queryKeys.garcomMetas(restauranteId) });
    },
  });
}

export function useAtualizarMeta(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarMetaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MetaInput & { id: string }) =>
      fn({ data: { ...data, restauranteId: restauranteId! } }),
    onSuccess: () => {
      if (restauranteId)
        qc.invalidateQueries({ queryKey: queryKeys.garcomMetas(restauranteId) });
    },
  });
}

export function useExcluirMeta(restauranteId: string | undefined) {
  const fn = useServerFn(excluirMetaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id, restauranteId: restauranteId! } }),
    onSuccess: () => {
      if (restauranteId)
        qc.invalidateQueries({ queryKey: queryKeys.garcomMetas(restauranteId) });
    },
  });
}

export function useGarcomBonus(
  restauranteId: string | undefined,
  opts: { status?: "pendente" | "pago" | "todos" } = {},
) {
  const fn = useServerFn(listarBonusFn);
  const status = opts.status ?? "pendente";
  return useQuery({
    queryKey: restauranteId
      ? queryKeys.garcomBonus(restauranteId, { status })
      : ["garcom-bonus", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId!, status } }),
    enabled: !!restauranteId,
  });
}

export function useCalcularBonus(restauranteId: string | undefined) {
  const fn = useServerFn(calcularBonusRestauranteFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (periodoRef?: string) =>
      fn({ data: { restauranteId: restauranteId!, periodoRef } }),
    onSuccess: () => {
      if (restauranteId)
        qc.invalidateQueries({ queryKey: queryKeys.garcomBonus(restauranteId) });
    },
  });
}

export function usePagarBonus(restauranteId: string | undefined) {
  const fn = useServerFn(pagarBonusFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => fn({ data: { restauranteId: restauranteId!, ids } }),
    onSuccess: () => {
      if (restauranteId)
        qc.invalidateQueries({ queryKey: queryKeys.garcomBonus(restauranteId) });
    },
  });
}