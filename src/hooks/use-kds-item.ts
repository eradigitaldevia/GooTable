import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import { marcarItemUnidadesFn } from "@/lib/kds.functions";

export function useMarcarItemUnidades(restauranteId: string | undefined) {
  const fn = useServerFn(marcarItemUnidadesFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; quantidadePronta: number }) =>
      fn({ data }),
    onSuccess: () => {
      if (restauranteId) {
        qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
      }
    },
  });
}