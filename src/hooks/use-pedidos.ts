import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  atualizarStatusPedidoFn,
  atualizarStatusDestinoFn,
  buscarItensPedidoFn,
  buscarClienteRestaurantePorTelefoneFn,
  cancelarItemPedidoFn,
  cancelarPedidoFn,
  carregarStatusPedidoFn,
  criarPedidoGarcomFn,
  criarPedidoPublicoFn,
  listarComandasAbertasMesaFn,
  listarPedidosDoDiaFn,
  resumoContaFn,
  resumoContaMesaFn,
  type StatusPedido,
} from "@/lib/pedidos.functions";

export function usePedidosDoDia(
  restauranteId: string | undefined,
  options?: { refetchInterval?: number | false },
) {
  const fn = useServerFn(listarPedidosDoDiaFn);
  return useQuery({
    queryKey: restauranteId ? queryKeys.pedidos(restauranteId) : ["pedidos", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
    refetchInterval: options?.refetchInterval ?? false,
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

export function useAtualizarStatusDestino(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarStatusDestinoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      pedidoId: string;
      destino: "cozinha" | "bar";
      status: "recebido" | "em_preparo" | "pronto";
    }) =>
      fn({
        data: {
          pedidoId: data.pedidoId,
          destino: data.destino,
          status: data.status,
        },
      }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
    },
  });
}

export function useCancelarPedido(restauranteId: string | undefined) {
  const fn = useServerFn(cancelarPedidoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { pedidoId: string; motivo?: string }) =>
      fn({ data: { pedidoId: data.pedidoId, restauranteId: restauranteId!, motivo: data.motivo } }),
    onSuccess: (_d, vars) => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
      qc.invalidateQueries({ queryKey: queryKeys.pedido(vars.pedidoId) });
      qc.invalidateQueries({ queryKey: ["resumo-conta-mesa"] });
      qc.invalidateQueries({ queryKey: ["sala-dados"] });
    },
  });
}

export function useCancelarItemPedido(restauranteId: string | undefined) {
  const fn = useServerFn(cancelarItemPedidoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; pedidoId: string; motivo?: string }) =>
      fn({ data: { itemId: data.itemId, restauranteId: restauranteId!, motivo: data.motivo } }),
    onSuccess: (_d, vars) => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
      qc.invalidateQueries({ queryKey: queryKeys.pedido(vars.pedidoId) });
      qc.invalidateQueries({ queryKey: ["resumo-conta-mesa"] });
      qc.invalidateQueries({ queryKey: ["sala-dados"] });
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

/* ---------- Garçom: criar pedido verbal ---------- */

export function useCriarPedidoGarcom() {
  const fn = useServerFn(criarPedidoGarcomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      restauranteId: string;
      mesaId: string;
      garcomId?: string | null;
      clienteId?: string | null;
      comandaId?: string | null;
      observacao?: string;
      itens: { produto_id: string; quantidade: number; observacao?: string }[];
    }) => fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sala-dados"] });
    },
  });
}

export function useBuscarClienteRestaurantePorTelefone() {
  const fn = useServerFn(buscarClienteRestaurantePorTelefoneFn);
  return useMutation({
    mutationFn: (data: { restauranteId: string; telefone: string }) =>
      fn({ data }),
  });
}

export function useListarComandasAbertasMesa() {
  const fn = useServerFn(listarComandasAbertasMesaFn);
  return useMutation({
    mutationFn: (data: { restauranteId: string; mesaId: string }) =>
      fn({ data }),
  });
}

export function useResumoContaMesa(
  restauranteId: string | undefined,
  mesaId: string | undefined,
) {
  const fn = useServerFn(resumoContaMesaFn);
  const enabled = !!restauranteId && !!mesaId;
  return useQuery({
    queryKey: ["resumo-conta-mesa", restauranteId ?? "none", mesaId ?? "none"],
    queryFn: () =>
      fn({ data: { restauranteId: restauranteId!, mesaId: mesaId! } }),
    enabled,
  });
}
