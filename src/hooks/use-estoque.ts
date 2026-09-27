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
export function useMovimentos(f: NonNullable<Parameters<typeof listarMovimentosFn>[0]>["data"]) {
  const fn = useServerFn(listarMovimentosFn);
  return useQuery({ queryKey: [...K, "movimentos", f], queryFn: () => fn({ data: f }) });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: K });
    qc.invalidateQueries({ queryKey: ["financeiro"] });
  };
}

export function useSalvarInsumo() {
  const fn = useServerFn(salvarInsumoFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: NonNullable<Parameters<typeof salvarInsumoFn>[0]>["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useExcluirInsumo() {
  const fn = useServerFn(excluirInsumoFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: NonNullable<Parameters<typeof excluirInsumoFn>[0]>["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useSalvarFicha() {
  const fn = useServerFn(salvarFichaFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: NonNullable<Parameters<typeof salvarFichaFn>[0]>["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useRegistrarMovimento() {
  const fn = useServerFn(registrarMovimentoFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: NonNullable<Parameters<typeof registrarMovimentoFn>[0]>["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useProduzirPreparo() {
  const fn = useServerFn(produzirPreparoFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: NonNullable<Parameters<typeof produzirPreparoFn>[0]>["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useAplicarInventario() {
  const fn = useServerFn(aplicarInventarioFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: NonNullable<Parameters<typeof aplicarInventarioFn>[0]>["data"]) => fn({ data }),
    onSuccess: inv,
  });
}
