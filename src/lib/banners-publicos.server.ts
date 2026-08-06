/**
 * Helper server-only para carregar os banners visíveis no cardápio público.
 * NÃO importar em código cliente.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { BannerPublico } from "./banners.functions";

export async function carregarBannersPublicos(
  restauranteId: string,
  canal: "mesa" | "delivery",
): Promise<BannerPublico[]> {
  const agora = new Date().toISOString();
  const { data: rest } = await supabaseAdmin
    .from("restaurantes")
    .select("banners_habilitados")
    .eq("id", restauranteId)
    .maybeSingle();
  if (rest && rest.banners_habilitados === false) return [];
  const { data, error } = await supabaseAdmin
    .from("banners_cardapio")
    .select("id, imagem_url, alt_text, destino_tipo, destino_valor")
    .eq("restaurante_id", restauranteId)
    .eq("ativo", true)
    .in("exibir_em", [canal, "ambos"])
    .or(`vigencia_inicio.is.null,vigencia_inicio.lte.${agora}`)
    .or(`vigencia_fim.is.null,vigencia_fim.gte.${agora}`)
    .order("ordem")
    .order("criado_em")
    .limit(3);
  if (error) return [];
  return (data ?? []) as BannerPublico[];
}
