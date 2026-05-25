import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import { carregarCardapioPublicoFn } from "@/lib/cardapio-publico.functions";

export function useCardapioPublico(qrToken: string | undefined) {
  const fn = useServerFn(carregarCardapioPublicoFn);
  return useQuery({
    queryKey: qrToken ? queryKeys.cardapioPublico(qrToken) : ["cardapio-publico", "none"],
    queryFn: () => fn({ data: { qrToken: qrToken! } }),
    enabled: !!qrToken,
  });
}
