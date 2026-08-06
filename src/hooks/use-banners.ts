import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  atualizarBannerFn,
  criarBannerFn,
  excluirBannerFn,
  listarBannersFn,
  type Banner,
} from "@/lib/banners.functions";

const bannersKey = (restauranteId: string) => ["banners", restauranteId] as const;

export function useBanners(restauranteId: string | undefined) {
  const fn = useServerFn(listarBannersFn);
  return useQuery({
    queryKey: restauranteId ? bannersKey(restauranteId) : ["banners", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

function useInvalidateBanners(restauranteId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    if (!restauranteId) return;
    qc.invalidateQueries({ queryKey: bannersKey(restauranteId) });
  };
}

type BannerInput = Parameters<typeof criarBannerFn>[0] extends never ? never : Record<string, unknown>;

export function useCriarBanner(restauranteId: string | undefined) {
  const fn = useServerFn(criarBannerFn);
  const invalidate = useInvalidateBanners(restauranteId);
  return useMutation({
    mutationFn: (banner: Omit<Banner, "id" | "restaurante_id">) =>
      fn({ data: { restauranteId: restauranteId!, banner } as unknown as BannerInput }),
    onSuccess: invalidate,
  });
}

export function useAtualizarBanner(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarBannerFn);
  const invalidate = useInvalidateBanners(restauranteId);
  return useMutation({
    mutationFn: (params: { id: string; banner: Partial<Omit<Banner, "id" | "restaurante_id">> }) =>
      fn({
        data: {
          id: params.id,
          restauranteId: restauranteId!,
          banner: params.banner,
        } as unknown as BannerInput,
      }),
    onSuccess: invalidate,
  });
}

export function useExcluirBanner(restauranteId: string | undefined) {
  const fn = useServerFn(excluirBannerFn);
  const invalidate = useInvalidateBanners(restauranteId);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id, restauranteId: restauranteId! } }),
    onSuccess: invalidate,
  });
}
