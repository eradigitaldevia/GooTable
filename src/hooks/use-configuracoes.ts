import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import { atualizarConfiguracoesFn, uploadLogoFn, validarPixFn } from "@/lib/configuracoes.functions";
import type { HorarioFuncionamento } from "@/lib/configuracoes.functions";

export function useValidarPix() {
  const fn = useServerFn(validarPixFn);
  return useMutation({
    mutationFn: (data: { pix_habilitado: boolean; pix_chave: string | null; pix_nome_titular: string | null }) =>
      fn({ data }),
  });
}

type Base = { restauranteId: string };

export type ConfigPayload =
  | (Base & {
      aba: "geral";
      nome: string;
      cnpj: string | null;
      telefone: string | null;
      endereco: string | null;
      horario_funcionamento: HorarioFuncionamento;
    })
  | (Base & {
      aba: "identidade";
      cor_primaria: string;
      cor_secundaria: string;
      cor_acento: string;
      tema_cardapio: "claro" | "escuro";
      logo_url: string | null;
    })
  | (Base & {
      aba: "pagamentos";
      pix_habilitado: boolean;
      pix_chave: string | null;
      pix_nome_titular: string | null;
    })
  | (Base & {
      aba: "taxas";
      taxa_servico_habilitada: boolean;
      taxa_servico_percentual: number | null;
      taxa_servico_descricao: string | null;
      taxa_servico_repasse_habilitado: boolean;
      taxa_servico_repasse_percentual: number | null;
      couvert_mesa_habilitado: boolean;
      couvert_mesa_valor: number | null;
      couvert_mesa_descricao: string | null;
    })
  | (Base & {
      aba: "couvert-artistico";
      couvert_artistico_habilitado: boolean;
      couvert_artistico_valor: number | null;
      couvert_artistico_descricao: string | null;
      couvert_artistico_repasse_habilitado: boolean;
      couvert_artistico_repasse_percentual: number | null;
    })
  | (Base & {
      aba: "comissoes";
      comissao_ativa: boolean;
      comissao_modo: "pedido" | "item";
      comissao_rateio_troca_turno: boolean;
      comissao_pedido_cliente: boolean;
      comissao_pedido_cliente_percentual: number | null;
      permitir_atendimento_cruzado: boolean;
    })
  | (Base & {
      aba: "caixa";
      caixa_alerta_horas: number;
      caixa_teto_dinheiro: number | null;
      caixa_conferencia_cega: boolean;
      caixa_obrigatorio_para_pagamento: boolean;
    })
  | (Base & {
      aba: "cardapio";
      upsell_habilitado: boolean;
    })
  | (Base & {
      aba: "delivery";
      delivery_ativo: boolean;
      delivery_retirada_ativa: boolean;
      delivery_slug: string | null;
      delivery_taxa_entrega: number;
      delivery_pedido_minimo: number;
      delivery_tempo_estimado_min: number;
      delivery_raio_km: number | null;
      delivery_aceita_dinheiro: boolean;
      delivery_aceita_cartao_entrega: boolean;
      delivery_aceita_pix: boolean;
    });

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
