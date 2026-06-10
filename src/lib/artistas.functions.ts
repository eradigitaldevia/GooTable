import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

export interface Artista {
  id: string;
  restaurante_id: string;
  nome: string;
  documento: string | null;
  chave_pix: string | null;
  tipo_chave_pix: string | null;
  observacao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

const artistaInput = z.object({
  nome: z.string().trim().min(2).max(120),
  documento: z.string().trim().max(40).nullable().optional(),
  chave_pix: z.string().trim().max(140).nullable().optional(),
  tipo_chave_pix: z.string().trim().max(20).nullable().optional(),
  observacao: z.string().trim().max(500).nullable().optional(),
  ativo: z.boolean().default(true),
});

export const listarArtistasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      apenasAtivos: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabaseAdmin
      .from("artistas")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("nome", { ascending: true });
    if (data.apenasAtivos) q = q.eq("ativo", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Artista[];
  });

export const criarArtistaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      ...artistaInput.shape,
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabaseAdmin.from("artistas").insert({
      restaurante_id: data.restauranteId,
      nome: data.nome,
      documento: data.documento || null,
      chave_pix: data.chave_pix || null,
      tipo_chave_pix: data.tipo_chave_pix || null,
      observacao: data.observacao || null,
      ativo: data.ativo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarArtistaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      id: z.string().uuid(),
      ...artistaInput.shape,
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabaseAdmin
      .from("artistas")
      .update({
        nome: data.nome,
        documento: data.documento || null,
        chave_pix: data.chave_pix || null,
        tipo_chave_pix: data.tipo_chave_pix || null,
        observacao: data.observacao || null,
        ativo: data.ativo,
      })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerArtistaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabaseAdmin
      .from("artistas")
      .delete()
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) {
      // FK pode bloquear se já houver apresentações/repasses; sugerir desativar.
      throw new Error(
        "Não foi possível excluir (artista já vinculado a apresentações). Desative-o.",
      );
    }
    return { ok: true };
  });