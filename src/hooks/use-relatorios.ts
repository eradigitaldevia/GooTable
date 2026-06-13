import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { gerarRelatorioComissoesFn, type RelatorioComissoes } from "@/lib/relatorios.functions";

export function useGerarRelatorioComissoes() {
  const fn = useServerFn(gerarRelatorioComissoesFn);
  return useMutation<
    RelatorioComissoes,
    Error,
    {
      restauranteId: string;
      garcomId?: string;
      inicio: string;
      fim: string;
      canais?: ("mesa" | "balcao" | "delivery" | "retirada")[];
    }
  >({
    mutationFn: (data) => fn({ data }),
  });
}