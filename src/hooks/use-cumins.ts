import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  atualizarCumimFn,
  criarCumimFn,
  listarCuminsFn,
  setUsaCumimFn,
  vincularUsuarioCumimFn,
  redefinirSenhaCumimFn,
  alterarEmailCumimFn,
  type Cumim,
} from "@/lib/cumins.functions";

const KEY = (restauranteId: string, incluirInativos: boolean) =>
  ["cumins", restauranteId, { incluirInativos }] as const;

export function useCumins(
  restauranteId: string | undefined,
  incluirInativos = true,
) {
  const fn = useServerFn(listarCuminsFn);
  return useQuery<Cumim[]>({
    queryKey: restauranteId
      ? KEY(restauranteId, incluirInativos)
      : ["cumins", "none"],
    queryFn: () =>
      fn({ data: { restauranteId: restauranteId!, incluirInativos } }),
    enabled: !!restauranteId,
  });
}

function invalidateCumins(qc: ReturnType<typeof useQueryClient>, rid?: string) {
  if (!rid) return;
  qc.invalidateQueries({ queryKey: ["cumins", rid] });
}

export function useCriarCumim(restauranteId: string | undefined) {
  const fn = useServerFn(criarCumimFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { nome: string; telefone?: string | null }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          nome: d.nome,
          telefone: d.telefone ?? null,
        },
      }),
    onSuccess: () => invalidateCumins(qc, restauranteId),
  });
}

export function useAtualizarCumim(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarCumimFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: {
      id: string;
      nome: string;
      telefone?: string | null;
      ativo: boolean;
    }) =>
      fn({
        data: {
          id: d.id,
          restauranteId: restauranteId!,
          nome: d.nome,
          telefone: d.telefone ?? null,
          ativo: d.ativo,
        },
      }),
    onSuccess: () => invalidateCumins(qc, restauranteId),
  });
}

export function useVincularUsuarioCumim(restauranteId: string | undefined) {
  const fn = useServerFn(vincularUsuarioCumimFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { cumimId: string; email: string; senha: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          cumimId: d.cumimId,
          email: d.email,
          senha: d.senha,
        },
      }),
    onSuccess: () => invalidateCumins(qc, restauranteId),
  });
}

export function useRedefinirSenhaCumim(restauranteId: string | undefined) {
  const fn = useServerFn(redefinirSenhaCumimFn);
  return useMutation({
    mutationFn: (d: { cumimId: string; novaSenha: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          cumimId: d.cumimId,
          novaSenha: d.novaSenha,
        },
      }),
  });
}

export function useAlterarEmailCumim(restauranteId: string | undefined) {
  const fn = useServerFn(alterarEmailCumimFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { cumimId: string; email: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          cumimId: d.cumimId,
          email: d.email,
        },
      }),
    onSuccess: () => invalidateCumins(qc, restauranteId),
  });
}

export function useSetUsaCumim(restauranteId: string | undefined) {
  const fn = useServerFn(setUsaCumimFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (usaCumim: boolean) =>
      fn({ data: { restauranteId: restauranteId!, usaCumim } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meu-restaurante"] });
    },
  });
}