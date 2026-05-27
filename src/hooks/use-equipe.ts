import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  adicionarMembroEquipeFn,
  alterarPapelMembroFn,
  convidarMembroEquipeFn,
  criarMembroEquipeFn,
  getMeuPapelFn,
  listarMembrosEquipeFn,
  reenviarConviteMembroFn,
  redefinirSenhaMembroFn,
  removerMembroEquipeFn,
  type PapelMembro,
} from "@/lib/equipe.functions";

export function useMeuPapel(enabled = true) {
  const fn = useServerFn(getMeuPapelFn);
  return useQuery({
    queryKey: ["meu-papel"],
    queryFn: () => fn(),
    enabled,
  });
}

export function useEquipe(restauranteId: string | undefined) {
  const fn = useServerFn(listarMembrosEquipeFn);
  return useQuery({
    queryKey: restauranteId ? queryKeys.membros(restauranteId) : ["membros", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useAdicionarMembroEquipe(restauranteId: string | undefined) {
  const fn = useServerFn(adicionarMembroEquipeFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; papel: PapelMembro }) =>
      fn({
        data: { restauranteId: restauranteId!, email: data.email, papel: data.papel },
      }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.membros(restauranteId) });
    },
  });
}

export function useAlterarPapelMembro(restauranteId: string | undefined) {
  const fn = useServerFn(alterarPapelMembroFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { membroId: string; novoPapel: PapelMembro }) =>
      fn({
        data: {
          membroId: data.membroId,
          restauranteId: restauranteId!,
          novoPapel: data.novoPapel,
        },
      }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.membros(restauranteId) });
    },
  });
}

export function useRemoverMembroEquipe(restauranteId: string | undefined) {
  const fn = useServerFn(removerMembroEquipeFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { membroId: string }) =>
      fn({ data: { membroId: data.membroId, restauranteId: restauranteId! } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.membros(restauranteId) });
    },
  });
}

export function useConvidarMembroEquipe(restauranteId: string | undefined) {
  const fn = useServerFn(convidarMembroEquipeFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; papel: PapelMembro }) =>
      fn({
        data: { restauranteId: restauranteId!, email: data.email, papel: data.papel },
      }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.membros(restauranteId) });
    },
  });
}

export function useCriarMembroEquipe(restauranteId: string | undefined) {
  const fn = useServerFn(criarMembroEquipeFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; senha: string; papel: PapelMembro }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          email: data.email,
          senha: data.senha,
          papel: data.papel,
        },
      }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.membros(restauranteId) });
    },
  });
}

export function useReenviarConviteMembro(restauranteId: string | undefined) {
  const fn = useServerFn(reenviarConviteMembroFn);
  return useMutation({
    mutationFn: (data: { membroId: string }) =>
      fn({ data: { membroId: data.membroId, restauranteId: restauranteId! } }),
  });
}

export function useRedefinirSenhaMembro(restauranteId: string | undefined) {
  const fn = useServerFn(redefinirSenhaMembroFn);
  return useMutation({
    mutationFn: (data: { membroId: string; novaSenha: string }) =>
      fn({
        data: {
          membroId: data.membroId,
          restauranteId: restauranteId!,
          novaSenha: data.novaSenha,
        },
      }),
  });
}