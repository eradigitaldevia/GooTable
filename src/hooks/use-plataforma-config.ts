import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { atualizarConfigVendas, getConfigPlataforma } from "@/lib/plataforma.functions";

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
    mutationFn: (data: { vendas_whatsapp: string | null; vendas_mensagem: string | null }) =>
      fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: plataformaConfigKey });
    },
  });
}
