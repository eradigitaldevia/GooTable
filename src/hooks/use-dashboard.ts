import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  atualizarRestauranteAdminFn,
  dashboardAdminFn,
  dashboardSuperadminFn,
  detalheRestauranteAdminFn,
  listarLogsFn,
  listarRestaurantesAdminFn,
} from "@/lib/dashboard.functions";

export function useDashboardAdmin(restauranteId: string | undefined) {
  const fn = useServerFn(dashboardAdminFn);
  return useQuery({
    queryKey: restauranteId
      ? ["dashboard-admin", restauranteId]
      : ["dashboard-admin", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useDashboardSuperadmin() {
  const fn = useServerFn(dashboardSuperadminFn);
  return useQuery({
    queryKey: ["dashboard-superadmin"],
    queryFn: () => fn(),
  });
}

export function useRestaurantesAdmin() {
  const fn = useServerFn(listarRestaurantesAdminFn);
  return useQuery({
    queryKey: queryKeys.restaurantes(),
    queryFn: () => fn(),
  });
}

export function useDetalheRestauranteAdmin(id: string | undefined) {
  const fn = useServerFn(detalheRestauranteAdminFn);
  return useQuery({
    queryKey: id ? queryKeys.restaurante(id) : ["restaurante", "none"],
    queryFn: () => fn({ data: { id: id! } }),
    enabled: !!id,
  });
}

export function useAtualizarRestauranteAdmin() {
  const fn = useServerFn(atualizarRestauranteAdminFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      nome: string;
      slug: string;
      cor_primaria: string | null;
      pix_habilitado: boolean;
      pix_chave: string | null;
      pix_nome_titular: string | null;
    }) => fn({ data }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurantes() });
      qc.invalidateQueries({ queryKey: queryKeys.restaurante(vars.id) });
    },
  });
}

export function useLogs() {
  const fn = useServerFn(listarLogsFn);
  return useQuery({
    queryKey: queryKeys.logs(),
    queryFn: () => fn(),
  });
}
