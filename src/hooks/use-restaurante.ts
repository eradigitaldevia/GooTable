import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import { criarRestauranteFn, getMeuRestauranteFn, type Restaurante } from "@/lib/restaurante.functions";

/** Restaurante do usuário autenticado. */
export function useMeuRestaurante(userId: string | undefined) {
  const fn = useServerFn(getMeuRestauranteFn);
  return useQuery({
    queryKey: queryKeys.meuRestaurante(userId ?? "anon"),
    queryFn: () => fn(),
    enabled: !!userId,
  });
}

/** Cria restaurante e vincula o usuário autenticado como admin. */
export function useCriarRestaurante(userId: string | undefined) {
  const fn = useServerFn(criarRestauranteFn);
  const qc = useQueryClient();
  return useMutation<Restaurante, Error, { nome: string }>({
    mutationFn: (data) => fn({ data }),
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: queryKeys.meuRestaurante(userId) });
    },
  });
}
