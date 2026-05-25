import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ajustarCashbackFn,
  detalheClienteFn,
  listarClientesFn,
} from "@/lib/admin-clientes.functions";

export function useListarClientes(input: {
  restauranteId: string | undefined;
  busca: string;
  page: number;
  pageSize: number;
}) {
  const fn = useServerFn(listarClientesFn);
  return useQuery({
    queryKey: [
      "admin-clientes",
      input.restauranteId ?? "none",
      input.busca,
      input.page,
      input.pageSize,
    ],
    queryFn: () =>
      fn({
        data: {
          restauranteId: input.restauranteId!,
          busca: input.busca,
          page: input.page,
          pageSize: input.pageSize,
        },
      }),
    enabled: !!input.restauranteId,
  });
}

export function useDetalheCliente(input: {
  restauranteId: string | undefined;
  clienteId: string | undefined;
}) {
  const fn = useServerFn(detalheClienteFn);
  return useQuery({
    queryKey: ["admin-cliente", input.restauranteId ?? "none", input.clienteId ?? "none"],
    queryFn: () =>
      fn({
        data: {
          restauranteId: input.restauranteId!,
          clienteId: input.clienteId!,
        },
      }),
    enabled: !!input.restauranteId && !!input.clienteId,
  });
}

export function useAjustarCashback(restauranteId: string | undefined) {
  const fn = useServerFn(ajustarCashbackFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { clienteId: string; valor: number; observacao: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          clienteId: data.clienteId,
          valor: data.valor,
          observacao: data.observacao,
        },
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-clientes", restauranteId ?? "none"] });
      qc.invalidateQueries({
        queryKey: ["admin-cliente", restauranteId ?? "none", vars.clienteId],
      });
    },
  });
}
