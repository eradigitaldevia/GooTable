import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lancarCouvertFn, removerCouvertFn } from "@/lib/couvert.functions";

export function useLancarCouvert() {
  const fn = useServerFn(lancarCouvertFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      restauranteId: string;
      comandaId: string;
      tipo: "mesa" | "artistico";
      quantidade: number;
      valorUnitario?: number;
      descricao?: string;
    }) => fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumo-conta"] });
      qc.invalidateQueries({ queryKey: ["resumo-conta-mesa"] });
      qc.invalidateQueries({ queryKey: ["sala-dados"] });
    },
  });
}

export function useRemoverCouvert() {
  const fn = useServerFn(removerCouvertFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { restauranteId: string; couvertId: string }) => fn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumo-conta"] });
      qc.invalidateQueries({ queryKey: ["resumo-conta-mesa"] });
      qc.invalidateQueries({ queryKey: ["sala-dados"] });
    },
  });
}
