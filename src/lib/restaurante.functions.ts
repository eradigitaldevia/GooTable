import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import slugify from "slugify";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface Restaurante {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_acento: string | null;
  tema_cardapio: string | null;
  pix_habilitado: boolean;
  pix_chave: string | null;
  pix_nome_titular: string | null;
  ativo: boolean;
  comissao_modo: "pedido" | "item";
  permitir_atendimento_cruzado: boolean;
  caixa_alerta_horas: number;
  caixa_teto_dinheiro: number | null;
  caixa_conferencia_cega: boolean;
  caixa_obrigatorio_para_pagamento: boolean;
  comissao_rateio_troca_turno: boolean;
  comissao_pedido_cliente: boolean;
  comissao_pedido_cliente_percentual: number | null;
  upsell_habilitado: boolean;
  taxa_servico_habilitada: boolean;
  taxa_servico_percentual: number | null;
  taxa_servico_descricao: string | null;
  couvert_mesa_habilitado: boolean;
  couvert_mesa_valor: number | null;
  couvert_mesa_descricao: string | null;
  couvert_artistico_habilitado: boolean;
  couvert_artistico_valor: number | null;
  couvert_artistico_descricao: string | null;
  taxa_servico_repasse_habilitado: boolean;
  taxa_servico_repasse_percentual: number | null;
  couvert_artistico_repasse_habilitado: boolean;
  couvert_artistico_repasse_percentual: number | null;
  usa_cumim: boolean;
  delivery_ativo?: boolean;
  delivery_retirada_ativa?: boolean;
  delivery_slug?: string | null;
  delivery_taxa_entrega?: number;
  delivery_pedido_minimo?: number;
  delivery_tempo_estimado_min?: number;
  delivery_raio_km?: number | null;
  delivery_aceita_dinheiro?: boolean;
  delivery_aceita_cartao_entrega?: boolean;
  delivery_aceita_pix?: boolean;
  url_publica_cardapio?: string | null;
  banners_habilitados?: boolean;
}

/** Restaurante do usuário autenticado (primeiro vínculo). */
export const getMeuRestauranteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("restaurante_membros")
      .select("restaurantes(*)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.restaurantes as Restaurante | null) ?? null;
  });

/** Cria restaurante e vincula o usuário como admin. */
export const criarRestauranteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ nome: z.string().min(2).max(100) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const baseSlug = slugify(data.nome, { lower: true, strict: true }) || "restaurante";
    let slug = baseSlug;
    let tentativa = 0;
    while (tentativa < 5) {
      const { data: existente } = await supabaseAdmin
        .from("restaurantes")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existente) break;
      tentativa++;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: rest, error } = await supabase
      .from("restaurantes")
      .insert({ nome: data.nome, slug })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: errMembro } = await supabase
      .from("restaurante_membros")
      .insert({ restaurante_id: rest.id, user_id: userId, papel: "admin" });
    if (errMembro) throw new Error(errMembro.message);

    return rest as Restaurante;
  });
