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
