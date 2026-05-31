import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarPagamentosComandaFn,
  listarComandasPagamentoPendenteFn,
  registrarPagamentoFn,
  type PagamentoMetodo,
} from "@/lib/pagamentos.functions";

const keyComanda = (comandaId: string) => ["pagamentos", "comanda", comandaId] as const;
const keyPendentes = (rid: string) => ["pagamentos", "pendentes", rid] as const;

export function usePagamentosComanda(restauranteId: string | undefined, comandaId: string | undefined) {
  const fn = useServerFn(listarPagamentosComandaFn);
  return useQuery({
    queryKey: comandaId ? keyComanda(comandaId) : ["pagamentos", "none"],
    queryFn: () =>
      fn({ data: { restauranteId: restauranteId!, comandaId: comandaId! } }),
    enabled: !!restauranteId && !!comandaId,
  });
}

export function useRegistrarPagamento(restauranteId: string | undefined) {
  const fn = useServerFn(registrarPagamentoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      comandaId: string;
      metodo: PagamentoMetodo;
      valor: number;
      observacao?: string;
    }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          comandaId: data.comandaId,
          metodo: data.metodo,
          valor: data.valor,
          observacao: data.observacao,
        },
      }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: keyComanda(vars.comandaId) });
      if (restauranteId) {
        qc.invalidateQueries({ queryKey: ["pedidos", restauranteId] });
        qc.invalidateQueries({ queryKey: keyPendentes(restauranteId) });
        qc.invalidateQueries({ queryKey: ["caixa"] });
      }
    },
  });
}

export function useComandasPagamentoPendente(restauranteId: string | undefined) {
  const fn = useServerFn(listarComandasPagamentoPendenteFn);
  return useQuery({
    queryKey: restauranteId ? keyPendentes(restauranteId) : ["pagamentos", "pendentes", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
    refetchInterval: 30_000,
  });
}
