import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  definirGarconsPedidoFn,
  listarPedidoGarconsFn,
} from "@/lib/pedido-garcons.functions";
import { queryKeys } from "@/lib/query-keys";

export function usePedidoGarcons(
  restauranteId: string | undefined,
  pedidoId: string | undefined,
) {
  const fn = useServerFn(listarPedidoGarconsFn);
  return useQuery({
    queryKey: ["pedido-garcons", restauranteId ?? "none", pedidoId ?? "none"],
    queryFn: () =>
      fn({ data: { restauranteId: restauranteId!, pedidoId: pedidoId! } }),
    enabled: !!restauranteId && !!pedidoId,
  });
}

export function useDefinirGarconsPedido(restauranteId: string | undefined) {
  const fn = useServerFn(definirGarconsPedidoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      pedidoId: string;
      itens: { garcom_id: string; peso: number }[];
    }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          pedidoId: data.pedidoId,
          itens: data.itens,
        },
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["pedido-garcons", restauranteId ?? "none", vars.pedidoId],
      });
      if (restauranteId) {
        qc.invalidateQueries({ queryKey: queryKeys.comissoes(restauranteId) });
        qc.invalidateQueries({
          queryKey: queryKeys.resumoComissoes(restauranteId),
        });
        qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
      }
    },
  });
}