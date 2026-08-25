import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  atualizarConfigSociais,
  atualizarConfigVendas,
  getConfigPlataforma,
} from "@/lib/plataforma.functions";


export const plataformaConfigKey = ["plataforma-config"] as const;

export function usePlataformaConfig() {
  const fn = useServerFn(getConfigPlataforma);
  return useQuery({
    queryKey: plataformaConfigKey,
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAtualizarConfigVendas() {
  const fn = useServerFn(atualizarConfigVendas);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      vendas_whatsapp: string | null;
      vendas_link: string | null;
      vendas_mensagem: string | null;
    }) => fn({ data }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: plataformaConfigKey });
    },
  });
}

export function useAtualizarConfigSociais() {
  const fn = useServerFn(atualizarConfigSociais);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      social_instagram: string | null;
      social_facebook: string | null;
      social_youtube: string | null;
      social_linkedin: string | null;
      social_tiktok: string | null;
      social_x: string | null;
    }) => fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: plataformaConfigKey });
    },
  });
}
