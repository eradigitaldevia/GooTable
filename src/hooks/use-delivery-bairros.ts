import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  excluirDeliveryBairroFn,
  listarDeliveryBairrosFn,
  salvarConfigBairrosFn,
  salvarDeliveryBairroFn,
} from "@/lib/delivery-bairros.functions";
import type { BairroForaLista } from "@/lib/taxa-bairro";

const key = (id: string) => ["delivery-bairros", id] as const;

export function useDeliveryBairros(restauranteId: string) {
  const fn = useServerFn(listarDeliveryBairrosFn);
  return useQuery({
    queryKey: key(restauranteId),
    queryFn: () => fn({ data: { restauranteId } }),
  });
}

function useInvalidar(restauranteId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key(restauranteId) });
}

export function useSalvarConfigBairros(restauranteId: string) {
  const fn = useServerFn(salvarConfigBairrosFn);
  const inv = useInvalidar(restauranteId);
  return useMutation({
    mutationFn: (d: { porBairro: boolean; foraLista: BairroForaLista }) =>
      fn({ data: { restauranteId, ...d } }),
    onSuccess: inv,
  });
}

export function useSalvarDeliveryBairro(restauranteId: string) {
  const fn = useServerFn(salvarDeliveryBairroFn);
  const inv = useInvalidar(restauranteId);
  return useMutation({
    mutationFn: (d: { id?: string; nome: string; taxa: number; ativo: boolean }) =>
      fn({ data: { restauranteId, ...d } }),
    onSuccess: inv,
  });
}

export function useExcluirDeliveryBairro(restauranteId: string) {
  const fn = useServerFn(excluirDeliveryBairroFn);
  const inv = useInvalidar(restauranteId);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { restauranteId, id } }),
    onSuccess: inv,
  });
}
