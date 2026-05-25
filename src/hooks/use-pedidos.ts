import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  atualizarStatusPedidoFn,
  buscarItensPedidoFn,
  carregarStatusPedidoFn,
  criarPedidoPublicoFn,
  listarPedidosDoDiaFn,
  resumoContaFn,
  type StatusPedido,
} from "@/lib/pedidos.functions";

export function usePedidosDoDia(restauranteId: string | undefined) {
  const fn = useServerFn(listarPedidosDoDiaFn);
  return useQuery({
    queryKey: restauranteId ? queryKeys.pedidos(restauranteId) : ["pedidos", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useItensPedido(pedidoId: string | undefined) {
  const fn = useServerFn(buscarItensPedidoFn);
  return useQuery({
    queryKey: pedidoId ? queryKeys.pedido(pedidoId) : ["pedido", "none"],
    queryFn: () => fn({ data: { pedidoId: pedidoId! } }),
    enabled: !!pedidoId,
  });
}

export function useAtualizarStatusPedido(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarStatusPedidoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; status: StatusPedido }) =>
      fn({ data: { id: data.id, status: data.status, restauranteId: restauranteId! } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
    },
  });
}

/* ---------- Público (cliente via QR) ---------- */

type ItemPedidoInput = {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string;
  cliente_nome?: string;
  cliente_id?: string;
};

export function useCriarPedidoPublico() {
  const fn = useServerFn(criarPedidoPublicoFn);
  return useMutation({
    mutationFn: (data: {
      qrToken: string;
      clienteId: string;
      comandaId: string;
      sessaoId: string;
      itens: ItemPedidoInput[];
      observacao?: string;
    }) => fn({ data }),
  });
}

export function useStatusPedidoPublico(pedidoId: string | undefined) {
  const fn = useServerFn(carregarStatusPedidoFn);
  return useQuery({
    queryKey: pedidoId ? queryKeys.pedido(pedidoId) : ["pedido", "none"],
    queryFn: () => fn({ data: { pedidoId: pedidoId! } }),
    enabled: !!pedidoId,
  });
}

export function useResumoConta(input: {
  qrToken: string;
  clienteId: string | undefined;
  comandaId: string | undefined;
  sessaoId: string | undefined;
}) {
  const fn = useServerFn(resumoContaFn);
  const enabled = !!input.clienteId && !!input.comandaId && !!input.sessaoId;
  return useQuery({
    queryKey: ["resumo-conta", input.qrToken, input.comandaId ?? "none"],
    queryFn: () =>
      fn({
        data: {
          qrToken: input.qrToken,
          clienteId: input.clienteId!,
          comandaId: input.comandaId!,
          sessaoId: input.sessaoId!,
        },
      }),
    enabled,
  });
}
