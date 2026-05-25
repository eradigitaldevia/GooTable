import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export interface Categoria {
  id: string;
  nome: string;
  ordem: number;
}
export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  disponivel: boolean;
  categoria_id: string | null;
  ordem: number;
}

const restauranteIdSchema = z.object({ restauranteId: z.string().uuid() });

/** Lista categorias + produtos do restaurante (admin). */
export const listarCardapioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => restauranteIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const [c, p] = await Promise.all([
      supabase.from("categorias").select("*").eq("restaurante_id", data.restauranteId).order("ordem"),
      supabase.from("produtos").select("*").eq("restaurante_id", data.restauranteId).order("ordem"),
    ]);
    if (c.error) throw new Error(c.error.message);
    if (p.error) throw new Error(p.error.message);
    return {
      categorias: (c.data ?? []) as Categoria[],
      produtos: (p.data ?? []) as Produto[],
    };
  });

/* ---------- Categorias ---------- */

export const criarCategoriaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      nome: z.string().trim().min(2).max(60),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("categorias")
      .insert({ restaurante_id: data.restauranteId, nome: data.nome });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarCategoriaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      restauranteId: z.string().uuid(),
      nome: z.string().trim().min(2).max(60),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("categorias")
      .update({ nome: data.nome })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirCategoriaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.from("categorias").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Produtos ---------- */

const produtoPayloadSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  descricao: z.string().max(500).nullable().optional(),
  preco: z.number().min(0),
  categoria_id: z.string().uuid().nullable(),
  imagem_url: z.string().nullable().optional(),
});

export const criarProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      payload: produtoPayloadSchema,
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.from("produtos").insert({
      restaurante_id: data.restauranteId,
      nome: data.payload.nome,
      descricao: data.payload.descricao ?? null,
      preco: data.payload.preco,
      categoria_id: data.payload.categoria_id,
      imagem_url: data.payload.imagem_url ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      restauranteId: z.string().uuid(),
      payload: produtoPayloadSchema,
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("produtos")
      .update({
        nome: data.payload.nome,
        descricao: data.payload.descricao ?? null,
        preco: data.payload.preco,
        categoria_id: data.payload.categoria_id,
        imagem_url: data.payload.imagem_url ?? null,
      })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.from("produtos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const alterarDisponibilidadeProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      restauranteId: z.string().uuid(),
      disponivel: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("produtos")
      .update({ disponivel: data.disponivel })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
