import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  atribuirGarcomMesaFn,
  atualizarGarcomFn,
  criarGarcomFn,
  liberarGarcomMesaFn,
  listarAtribuicoesMesasFn,
  listarComissoesFn,
  listarGarconsFn,
  pagarComissoesFn,
  resumoComissoesFn,
} from "@/lib/garcons.functions";
import {
  redefinirSenhaGarcomFn,
  vincularUsuarioGarcomFn,
} from "@/lib/garcom-usuario.functions";

export function useGarcons(restauranteId: string | undefined, incluirInativos = true) {
  const fn = useServerFn(listarGarconsFn);
  return useQuery({
    queryKey: restauranteId
      ? [...queryKeys.garcons(restauranteId), { incluirInativos }]
      : ["garcons", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId!, incluirInativos } }),
    enabled: !!restauranteId,
  });
}

export function useCriarGarcom(restauranteId: string | undefined) {
  const fn = useServerFn(criarGarcomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nome: string; telefone?: string | null; percentualComissao: number }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          nome: data.nome,
          telefone: data.telefone ?? null,
          percentualComissao: data.percentualComissao,
        },
      }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.garcons(restauranteId) });
    },
  });
}

export function useAtualizarGarcom(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarGarcomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      nome: string;
      telefone?: string | null;
      percentualComissao: number;
      ativo: boolean;
    }) =>
      fn({
        data: {
          id: data.id,
          restauranteId: restauranteId!,
          nome: data.nome,
          telefone: data.telefone ?? null,
          percentualComissao: data.percentualComissao,
          ativo: data.ativo,
        },
      }),
    onSuccess: () => {
      if (restauranteId) {
        qc.invalidateQueries({ queryKey: queryKeys.garcons(restauranteId) });
        qc.invalidateQueries({ queryKey: queryKeys.atribuicoesMesas(restauranteId) });
        qc.invalidateQueries({ queryKey: queryKeys.resumoComissoes(restauranteId) });
      }
    },
  });
}

export function useAtribuicoesMesas(restauranteId: string | undefined) {
  const fn = useServerFn(listarAtribuicoesMesasFn);
  return useQuery({
    queryKey: restauranteId
      ? queryKeys.atribuicoesMesas(restauranteId)
      : ["atribuicoes-mesas", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useAtribuirGarcomMesa(restauranteId: string | undefined) {
  const fn = useServerFn(atribuirGarcomMesaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { mesaId: string; garcomId: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          mesaId: data.mesaId,
          garcomId: data.garcomId,
        },
      }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.atribuicoesMesas(restauranteId) });
    },
  });
}

export function useLiberarGarcomMesa(restauranteId: string | undefined) {
  const fn = useServerFn(liberarGarcomMesaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { mesaId: string }) =>
      fn({ data: { restauranteId: restauranteId!, mesaId: data.mesaId } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.atribuicoesMesas(restauranteId) });
    },
  });
}

export function useComissoes(
  restauranteId: string | undefined,
  filtros: { status?: "pendente" | "pago" | "todos"; garcomId?: string } = {},
) {
  const fn = useServerFn(listarComissoesFn);
  const status = filtros.status ?? "pendente";
  return useQuery({
    queryKey: restauranteId
      ? queryKeys.comissoes(restauranteId, { status, garcomId: filtros.garcomId })
      : ["comissoes", "none"],
    queryFn: () =>
      fn({
        data: {
          restauranteId: restauranteId!,
          status,
          garcomId: filtros.garcomId,
        },
      }),
    enabled: !!restauranteId,
  });
}

export function usePagarComissoes(restauranteId: string | undefined) {
  const fn = useServerFn(pagarComissoesFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ids: string[] }) =>
      fn({ data: { restauranteId: restauranteId!, ids: data.ids } }),
    onSuccess: () => {
      if (restauranteId) {
        qc.invalidateQueries({ queryKey: ["comissoes", restauranteId] });
        qc.invalidateQueries({ queryKey: queryKeys.resumoComissoes(restauranteId) });
      }
    },
  });
}

export function useResumoComissoes(restauranteId: string | undefined) {
  const fn = useServerFn(resumoComissoesFn);
  return useQuery({
    queryKey: restauranteId
      ? queryKeys.resumoComissoes(restauranteId)
      : ["resumo-comissoes", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useVincularUsuarioGarcom(restauranteId: string | undefined) {
  const fn = useServerFn(vincularUsuarioGarcomFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { garcomId: string; email: string; senha: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          garcomId: data.garcomId,
          email: data.email,
          senha: data.senha,
        },
      }),
    onSuccess: () => {
      if (restauranteId)
        qc.invalidateQueries({ queryKey: queryKeys.garcons(restauranteId) });
    },
  });
}

export function useRedefinirSenhaGarcom(restauranteId: string | undefined) {
  const fn = useServerFn(redefinirSenhaGarcomFn);
  return useMutation({
    mutationFn: (data: { garcomId: string; novaSenha: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          garcomId: data.garcomId,
          novaSenha: data.novaSenha,
        },
      }),
  });
}