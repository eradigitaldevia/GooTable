import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  abrirCaixaFn,
  fecharCaixaFn,
  listarMovimentosTurnoFn,
  listarTurnosFn,
  obterTotaisTurnoFn,
  obterTurnoAtivoFn,
  registrarMovimentoCaixaFn,
} from "@/lib/caixa.functions";

const kAtivo = (rid: string) => ["caixa", "turno-ativo", rid] as const;
const kTotais = (rid: string, tid: string) => ["caixa", "totais", rid, tid] as const;
const kMov = (rid: string, tid: string) => ["caixa", "movimentos", rid, tid] as const;
const kHist = (rid: string) => ["caixa", "historico", rid] as const;

export function useTurnoAtivo(restauranteId: string | undefined) {
  const fn = useServerFn(obterTurnoAtivoFn);
  return useQuery({
    queryKey: restauranteId ? kAtivo(restauranteId) : ["caixa", "turno-ativo", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
    refetchInterval: 30_000,
  });
}

export function useTotaisTurno(
  restauranteId: string | undefined,
  turnoId: string | undefined,
) {
  const fn = useServerFn(obterTotaisTurnoFn);
  return useQuery({
    queryKey:
      restauranteId && turnoId ? kTotais(restauranteId, turnoId) : ["caixa", "totais", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId!, turnoId: turnoId! } }),
    enabled: !!restauranteId && !!turnoId,
    refetchInterval: 30_000,
  });
}

export function useMovimentosTurno(
  restauranteId: string | undefined,
  turnoId: string | undefined,
) {
  const fn = useServerFn(listarMovimentosTurnoFn);
  return useQuery({
    queryKey:
      restauranteId && turnoId ? kMov(restauranteId, turnoId) : ["caixa", "movimentos", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId!, turnoId: turnoId! } }),
    enabled: !!restauranteId && !!turnoId,
  });
}

export function useHistoricoTurnos(restauranteId: string | undefined) {
  const fn = useServerFn(listarTurnosFn);
  return useQuery({
    queryKey: restauranteId ? kHist(restauranteId) : ["caixa", "historico", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useAbrirCaixa(restauranteId: string | undefined) {
  const fn = useServerFn(abrirCaixaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { operadorNome: string; fundoInicial: number }) =>
      fn({ data: { restauranteId: restauranteId!, ...data } }),
    onSuccess: () => {
      if (!restauranteId) return;
      qc.invalidateQueries({ queryKey: kAtivo(restauranteId) });
      qc.invalidateQueries({ queryKey: kHist(restauranteId) });
    },
  });
}

export function useRegistrarMovimentoCaixa(restauranteId: string | undefined) {
  const fn = useServerFn(registrarMovimentoCaixaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      turnoId: string;
      tipo: "sangria" | "suprimento";
      valor: number;
      motivo?: string;
    }) => fn({ data: { restauranteId: restauranteId!, ...data } }),
    onSuccess: (_r, vars) => {
      if (!restauranteId) return;
      qc.invalidateQueries({ queryKey: kMov(restauranteId, vars.turnoId) });
      qc.invalidateQueries({ queryKey: kTotais(restauranteId, vars.turnoId) });
    },
  });
}

export function useFecharCaixa(restauranteId: string | undefined) {
  const fn = useServerFn(fecharCaixaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      turnoId: string;
      contagemFisica: number;
      fundoFinal: number;
      obsFechamento?: string;
    }) => fn({ data: { restauranteId: restauranteId!, ...data } }),
    onSuccess: (_r, vars) => {
      if (!restauranteId) return;
      qc.invalidateQueries({ queryKey: kAtivo(restauranteId) });
      qc.invalidateQueries({ queryKey: kHist(restauranteId) });
      qc.invalidateQueries({ queryKey: kMov(restauranteId, vars.turnoId) });
      qc.invalidateQueries({ queryKey: kTotais(restauranteId, vars.turnoId) });
    },
  });
}