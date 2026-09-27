import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  aplicarInventarioFn,
  excluirInsumoFn,
  listarFichasFn,
  listarInsumosFn,
  listarMovimentosFn,
  obterCustoProdutosFn,
  obterResumoEstoqueFn,
  produzirPreparoFn,
  registrarMovimentoFn,
  salvarFichaFn,
  salvarInsumoFn,
} from "@/lib/estoque.functions";

const K = ["estoque"] as const;
type DataOf<F extends (...a: never[]) => unknown> = NonNullable<Parameters<F>[0]> extends { data: infer D } ? D : never;

export function useInsumos(rid: string) {
  const fn = useServerFn(listarInsumosFn);
  return useQuery({ queryKey: [...K, "insumos", rid], queryFn: () => fn({ data: { restauranteId: rid } }) });
}
export function useFichas(rid: string) {
  const fn = useServerFn(listarFichasFn);
  return useQuery({ queryKey: [...K, "fichas", rid], queryFn: () => fn({ data: { restauranteId: rid } }) });
}
export function useResumoEstoque(rid: string) {
  const fn = useServerFn(obterResumoEstoqueFn);
  return useQuery({ queryKey: [...K, "resumo", rid], queryFn: () => fn({ data: { restauranteId: rid } }) });
}
export function useCustoProdutos(rid: string) {
  const fn = useServerFn(obterCustoProdutosFn);
  return useQuery({ queryKey: [...K, "custos", rid], queryFn: () => fn({ data: { restauranteId: rid } }) });
}
export function useMovimentos(f: DataOf<typeof listarMovimentosFn>) {
  const fn = useServerFn(listarMovimentosFn);
  return useQuery({ queryKey: [...K, "movimentos", f], queryFn: () => fn({ data: f }) });
}

function useEstoqueMutation<F extends (a: { data: never }) => Promise<unknown>>(serverFn: F) {
  const fn = useServerFn(serverFn as never) as unknown as (a: { data: DataOf<F> }) => Promise<Awaited<ReturnType<F>>>;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DataOf<F>) => fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K });
      qc.invalidateQueries({ queryKey: ["financeiro"] });
    },
  });
}

export const useSalvarInsumo = () => useEstoqueMutation(salvarInsumoFn);
export const useExcluirInsumo = () => useEstoqueMutation(excluirInsumoFn);
export const useSalvarFicha = () => useEstoqueMutation(salvarFichaFn);
export const useRegistrarMovimento = () => useEstoqueMutation(registrarMovimentoFn);
export const useProduzirPreparo = () => useEstoqueMutation(produzirPreparoFn);
export const useAplicarInventario = () => useEstoqueMutation(aplicarInventarioFn);
