import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  obterProgramaFn,
  salvarProgramaFn,
  type ProgramaFidelidade,
} from "@/lib/fidelidade.functions";

export function useProgramaFidelidade(restauranteId: string | undefined) {
  const fn = useServerFn(obterProgramaFn);
  return useQuery({
    queryKey: ["programa-fidelidade", restauranteId ?? "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useSalvarProgramaFidelidade(restauranteId: string | undefined) {
  const fn = useServerFn(salvarProgramaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ProgramaFidelidade, "id"> & { restauranteId?: string }) =>
      fn({
        data: {
          restauranteId: restauranteId!,
          ativo: data.ativo,
          percentual_cashback: data.percentual_cashback,
          percentual_max_resgate: data.percentual_max_resgate,
          validade_dias: data.validade_dias,
          valor_minimo_pedido: data.valor_minimo_pedido,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programa-fidelidade", restauranteId ?? "none"] });
    },
  });
}
