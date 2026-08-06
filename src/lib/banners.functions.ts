import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export type BannerExibirEm = "mesa" | "delivery" | "ambos";
export type BannerDestinoTipo = "nenhum" | "categoria" | "produto" | "link";

export interface Banner {
  id: string;
  restaurante_id: string;
  imagem_url: string;
  alt_text: string;
  ordem: number;
  ativo: boolean;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  exibir_em: BannerExibirEm;
  destino_tipo: BannerDestinoTipo;
  destino_valor: string | null;
}

const bannerCampos = z.object({
  imagem_url: z.string().url().max(600),
  alt_text: z.string().trim().max(120).default(""),
  ordem: z.number().int().min(0).max(99).default(0),
  ativo: z.boolean().default(true),
  vigencia_inicio: z.string().nullable().default(null),
  vigencia_fim: z.string().nullable().default(null),
  exibir_em: z.enum(["mesa", "delivery", "ambos"]).default("ambos"),
  destino_tipo: z.enum(["nenhum", "categoria", "produto", "link"]).default("nenhum"),
  destino_valor: z.string().trim().max(600).nullable().default(null),
});

function mensagemErro(msg: string) {
  if (msg.includes("limite_banners_ativos")) {
    return "Limite de 3 banners ativos por restaurante atingido. Desative um banner antes de ativar outro.";
  }
  return msg;
}

/** Lista os banners do restaurante (admin). */
export const listarBannersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("banners_cardapio")
      .select(
        "id, restaurante_id, imagem_url, alt_text, ordem, ativo, vigencia_inicio, vigencia_fim, exibir_em, destino_tipo, destino_valor",
      )
      .eq("restaurante_id", data.restauranteId)
      .order("ordem")
      .order("criado_em");
    if (error) throw new Error(error.message);
    return (rows ?? []) as Banner[];
  });

/** Cria um banner. */
export const criarBannerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), banner: bannerCampos }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("banners_cardapio")
      .insert({ restaurante_id: data.restauranteId, ...data.banner });
    if (error) throw new Error(mensagemErro(error.message));
    return { ok: true };
  });

/** Atualiza um banner existente. */
export const atualizarBannerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        restauranteId: z.string().uuid(),
        banner: bannerCampos.partial(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("banners_cardapio")
      .update(data.banner)
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(mensagemErro(error.message));
    return { ok: true };
  });

/** Exclui um banner. */
export const excluirBannerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("banners_cardapio")
      .delete()
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Formato reduzido usado nas telas públicas (mesa e delivery). */
export interface BannerPublico {
  id: string;
  imagem_url: string;
  alt_text: string;
  destino_tipo: BannerDestinoTipo;
  destino_valor: string | null;
}
