import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { minhaContaFn } from "@/lib/clientes.functions";

export function useMinhaConta(input: {
  qrToken: string;
  clienteId: string | undefined;
  comandaId: string | undefined;
  sessaoId: string | undefined;
  page: number;
  pageSize: number;
}) {
  const fn = useServerFn(minhaContaFn);
  const enabled = !!input.clienteId && !!input.comandaId && !!input.sessaoId;
  return useQuery({
    queryKey: [
      "minha-conta",
      input.qrToken,
      input.clienteId ?? "none",
      input.comandaId ?? "none",
      input.page,
      input.pageSize,
    ],
    queryFn: () =>
      fn({
        data: {
          qrToken: input.qrToken,
          clienteId: input.clienteId!,
          comandaId: input.comandaId!,
          sessaoId: input.sessaoId!,
          page: input.page,
          pageSize: input.pageSize,
        },
      }),
    enabled,
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aplicarCashbackFn } from "@/lib/cashback.functions";

export function useAplicarCashback(qrToken: string) {
  const fn = useServerFn(aplicarCashbackFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clienteId: string;
      comandaId: string;
      sessaoId: string;
      valor: number;
    }) => fn({ data: { qrToken, ...data } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["minha-conta", qrToken] });
      qc.invalidateQueries({ queryKey: ["resumo-conta", qrToken] });
    },
  });
}
