import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface RestaurantePublico {
  id: string;
  nome: string;
  logo_url: string | null;
  cor_primaria: string | null;
  ativo: boolean;
  upsell_habilitado: boolean;
}
export interface MesaPublica {
  id: string;
  numero: string;
  restaurante_id: string;
  ativa: boolean;
}
export interface CategoriaPublica {
  id: string;
  nome: string;
  ordem: number;
}
export interface ProdutoPublico {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria_id: string | null;
  disponivel: boolean;
  ordem: number;
}

export type ResultadoCardapio =
  | { erro: string; restaurante?: never; mesa?: never; categorias?: never; produtos?: never }
  | {
      erro?: never;
      restaurante: RestaurantePublico;
      mesa: MesaPublica;
      categorias: CategoriaPublica[];
      produtos: ProdutoPublico[];
    };

/** Carrega cardápio inteiro a partir do qrToken da mesa (público). */
export const carregarCardapioPublicoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ qrToken: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }): Promise<ResultadoCardapio> => {
    const { data: m, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, numero, restaurante_id, ativa")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) return { erro: mErr.message };
    if (!m) return { erro: "Mesa não encontrada. Verifique o QR Code." };
    if (!m.ativa) return { erro: "Esta mesa está inativa no momento." };

    const [{ data: r }, { data: cats }, { data: prods }] = await Promise.all([
      supabaseAdmin
        .from("restaurantes")
        .select("id, nome, logo_url, cor_primaria, ativo, upsell_habilitado")
        .eq("id", m.restaurante_id)
        .maybeSingle(),
      supabaseAdmin
        .from("categorias")
        .select("id, nome, ordem")
        .eq("restaurante_id", m.restaurante_id)
        .order("ordem"),
      supabaseAdmin
        .from("produtos")
        .select("id, nome, descricao, preco, imagem_url, categoria_id, disponivel, ordem")
        .eq("restaurante_id", m.restaurante_id)
        .eq("disponivel", true)
        .order("ordem"),
    ]);

    if (!r) return { erro: "Restaurante não encontrado." };
    if (!r.ativo) {
      return { erro: "Restaurante temporariamente indisponível. Tente novamente mais tarde." };
    }

    return {
      restaurante: r as RestaurantePublico,
      mesa: m as MesaPublica,
      categorias: (cats ?? []) as CategoriaPublica[],
      produtos: (prods ?? []) as ProdutoPublico[],
    };
  });
