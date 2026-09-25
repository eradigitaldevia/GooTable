import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  alterarStatusLancamentoFn,
  excluirCadastroFn,
  integrarRepassesFn,
  listarCadastrosFinanceiroFn,
  listarLancamentosFn,
  obterDreFn,
  obterFluxoCaixaFn,
  obterResumoFinanceiroFn,
  salvarCategoriaFn,
  salvarFornecedorFn,
  salvarLancamentoFn,
} from "@/lib/financeiro.functions";

export interface Periodo {
  inicio: string;
  fim: string;
}

const K = ["financeiro"] as const;

export function useResumoFinanceiro(rid: string, p: Periodo) {
  const fn = useServerFn(obterResumoFinanceiroFn);
  return useQuery({
    queryKey: [...K, "resumo", rid, p],
    queryFn: () => fn({ data: { restauranteId: rid, ...p } }),
  });
}

export function useDre(rid: string, p: Periodo) {
  const fn = useServerFn(obterDreFn);
  return useQuery({
    queryKey: [...K, "dre", rid, p],
    queryFn: () => fn({ data: { restauranteId: rid, ...p } }),
  });
}

export function useFluxoCaixa(rid: string, p: Periodo, agrupamento: "dia" | "mes") {
  const fn = useServerFn(obterFluxoCaixaFn);
  return useQuery({
    queryKey: [...K, "fluxo", rid, p, agrupamento],
    queryFn: () => fn({ data: { restauranteId: rid, ...p, agrupamento } }),
  });
}

export function useLancamentos(
  rid: string,
  p: Periodo,
  tipo: "pagar" | "receber",
  filtros: { status: "todos" | "pendente" | "pago" | "cancelado" | "vencido"; categoriaId?: string; fornecedorId?: string },
) {
  const fn = useServerFn(listarLancamentosFn);
  return useQuery({
    queryKey: [...K, "lancamentos", rid, tipo, p, filtros],
    queryFn: () => fn({ data: { restauranteId: rid, ...p, tipo, ...filtros } }),
  });
}

export function useCadastrosFinanceiro(rid: string) {
  const fn = useServerFn(listarCadastrosFinanceiroFn);
  return useQuery({
    queryKey: [...K, "cadastros", rid],
    queryFn: () => fn({ data: { restauranteId: rid } }),
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: K });
}

export function useSalvarLancamento() {
  const fn = useServerFn(salvarLancamentoFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useAlterarStatusLancamento() {
  const fn = useServerFn(alterarStatusLancamentoFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useIntegrarRepasses() {
  const fn = useServerFn(integrarRepassesFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (restauranteId: string) => fn({ data: { restauranteId } }),
    onSuccess: inv,
  });
}

export function useSalvarCategoria() {
  const fn = useServerFn(salvarCategoriaFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useSalvarFornecedor() {
  const fn = useServerFn(salvarFornecedorFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: inv,
  });
}

export function useExcluirCadastro() {
  const fn = useServerFn(excluirCadastroFn);
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: inv,
  });
}
