import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  adicionarMembro,
  atualizarContratoRestaurante,
  atualizarDonoRestaurante,
  atualizarRestauranteAdmin,
  criarRestauranteAdmin,
  excluirRestaurante,
  getDonoRestaurante,
  getRestauranteAdmin,
  listarMembros,
  listarPedidosRestaurante,
  listarRestaurantesAdmin,
  removerMembro,
  setRestauranteAtivo,
  verificarPlatformAdmin,
} from "@/lib/superadmin.functions";

export function useVerificarPlatformAdmin(enabled = true) {
  const fn = useServerFn(verificarPlatformAdmin);
  return useQuery({
    queryKey: ["platform-admin"],
    queryFn: () => fn(),
    enabled,
  });
}

export function useCriarRestauranteAdmin() {
  const fn = useServerFn(criarRestauranteAdmin);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      nome: string;
      slug: string;
      donoEmail: string;
      donoSenha: string;
      donoNome: string;
      vencimento?: string | null;
      notas?: string | null;
    }) => fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurantes() });
    },
  });
}

export function useSetRestauranteAtivo() {
  const fn = useServerFn(setRestauranteAtivo);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; ativo: boolean; motivo?: string }) => fn({ data }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurantes() });
      qc.invalidateQueries({ queryKey: queryKeys.restaurante(vars.id) });
    },
  });
}

export function useExcluirRestaurante() {
  const fn = useServerFn(excluirRestaurante);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string }) => fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurantes() });
    },
  });
}

export function useMembros(restauranteId: string | undefined) {
  const fn = useServerFn(listarMembros);
  return useQuery({
    queryKey: restauranteId ? queryKeys.membros(restauranteId) : ["membros", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useAdicionarMembro(restauranteId: string | undefined) {
  const fn = useServerFn(adicionarMembro);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; papel?: "admin" | "staff" }) =>
      fn({ data: { restauranteId: restauranteId!, email: data.email, papel: data.papel ?? "admin" } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.membros(restauranteId) });
    },
  });
}

export function useRemoverMembro(restauranteId: string | undefined) {
  const fn = useServerFn(removerMembro);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { membroId: string }) =>
      fn({ data: { membroId: data.membroId, restauranteId: restauranteId! } }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: queryKeys.membros(restauranteId) });
    },
  });
}

export function useRestauranteAdmin(id: string | undefined) {
  const fn = useServerFn(getRestauranteAdmin);
  return useQuery({
    queryKey: id ? queryKeys.restaurante(id) : ["restaurante", "none"],
    queryFn: () => fn({ data: { id: id! } }),
    enabled: !!id,
  });
}

export function usePedidosRestaurante(restauranteId: string | undefined, limit = 20) {
  const fn = useServerFn(listarPedidosRestaurante);
  return useQuery({
    queryKey: restauranteId ? queryKeys.pedidosRestaurante(restauranteId) : ["pedidos-restaurante", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId!, limit } }),
    enabled: !!restauranteId,
  });
}

export function useAtualizarRestauranteAdmin() {
  const fn = useServerFn(atualizarRestauranteAdmin);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      nome: string;
      slug: string;
      cor_primaria?: string | null;
      pix_habilitado?: boolean;
      pix_chave?: string | null;
      pix_nome_titular?: string | null;
    }) => fn({ data }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurante(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.restaurantes() });
    },
  });
}

export function useAtualizarContratoRestaurante() {
  const fn = useServerFn(atualizarContratoRestaurante);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      vencimento?: string | null;
      notas?: string | null;
      bloqueioAutomatico?: boolean;
    }) => fn({ data }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurante(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.restaurantes() });
    },
  });
}

export function useDonoRestaurante(restauranteId: string | undefined, enabled = true) {
  const fn = useServerFn(getDonoRestaurante);
  return useQuery({
    queryKey: restauranteId ? ["dono-restaurante", restauranteId] : ["dono-restaurante", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId && enabled,
  });
}

export function useAtualizarDonoRestaurante() {
  const fn = useServerFn(atualizarDonoRestaurante);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { restauranteId: string; nome: string; email: string; senha?: string }) =>
      fn({ data }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["dono-restaurante", vars.restauranteId] });
    },
  });
}

export function useListarRestaurantesAdmin() {
  const fn = useServerFn(listarRestaurantesAdmin);
  return useQuery({
    queryKey: queryKeys.restaurantes(),
    queryFn: () => fn(),
  });
}
