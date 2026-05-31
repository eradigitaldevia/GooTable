import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import { atualizarConfiguracoesFn, uploadLogoFn, validarPixFn } from "@/lib/configuracoes.functions";

export function useValidarPix() {
  const fn = useServerFn(validarPixFn);
  return useMutation({
    mutationFn: (data: { pix_habilitado: boolean; pix_chave: string | null; pix_nome_titular: string | null }) =>
      fn({ data }),
  });
}

type ConfigPayload = {
  restauranteId: string;
  nome: string;
  cor_primaria: string;
  logo_url: string | null;
  pix_habilitado: boolean;
  pix_chave: string | null;
  pix_nome_titular: string | null;
  comissao_modo: "pedido" | "item";
  permitir_atendimento_cruzado: boolean;
  caixa_alerta_horas: number;
  caixa_teto_dinheiro: number | null;
  caixa_conferencia_cega: boolean;
  caixa_obrigatorio_para_pagamento: boolean;
};

export function useAtualizarConfiguracoes(userId: string | undefined) {
  const fn = useServerFn(atualizarConfiguracoesFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfigPayload) => fn({ data }),
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: queryKeys.meuRestaurante(userId) });
    },
  });
}

export function useUploadLogo() {
  const fn = useServerFn(uploadLogoFn);
  return useMutation<{ url: string }, Error, { file: File; restauranteId: string }>({
    mutationFn: ({ file, restauranteId }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("restauranteId", restauranteId);
      return fn({ data: fd });
    },
  });
}
