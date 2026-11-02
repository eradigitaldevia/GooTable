import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import { normalizarBairro, type BairroForaLista } from "./taxa-bairro";

export interface DeliveryBairro {
  id: string;
  nome: string;
  taxa: number;
  ativo: boolean;
  ordem: number;
}

export interface DeliveryBairrosConfig {
  porBairro: boolean;
  foraLista: BairroForaLista;
  bairros: DeliveryBairro[];
}

const idSchema = z.object({ restauranteId: z.string().uuid() });

export const listarDeliveryBairrosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<DeliveryBairrosConfig> => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const [{ data: r, error: rErr }, { data: rows, error: bErr }] = await Promise.all([
      context.supabase
        .from("restaurantes")
        .select("delivery_taxa_por_bairro, delivery_bairro_fora_lista")
        .eq("id", data.restauranteId)
        .maybeSingle(),
      context.supabase
        .from("delivery_bairros")
        .select("id, nome, taxa, ativo, ordem")
        .eq("restaurante_id", data.restauranteId)
        .order("nome"),
    ]);
    if (rErr) throw new Error(rErr.message);
    if (bErr) throw new Error(bErr.message);
    return {
      porBairro: !!r?.delivery_taxa_por_bairro,
      foraLista: (r?.delivery_bairro_fora_lista as BairroForaLista) ?? "bloquear",
      bairros: (rows ?? []).map((b) => ({ ...b, taxa: Number(b.taxa) })),
    };
  });

export const salvarConfigBairrosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    idSchema
      .extend({
        porBairro: z.boolean(),
        foraLista: z.enum(["bloquear", "taxa_padrao"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({
        delivery_taxa_por_bairro: data.porBairro,
        delivery_bairro_fora_lista: data.foraLista,
      })
      .eq("id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const salvarDeliveryBairroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    idSchema
      .extend({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(2).max(80),
        taxa: z.number().min(0).max(500),
        ativo: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const payload = {
      restaurante_id: data.restauranteId,
      nome: data.nome,
      nome_normalizado: normalizarBairro(data.nome),
      taxa: data.taxa,
      ativo: data.ativo,
    };
    const q = data.id
      ? context.supabase
          .from("delivery_bairros")
          .update(payload)
          .eq("id", data.id)
          .eq("restaurante_id", data.restauranteId)
      : context.supabase.from("delivery_bairros").insert(payload);
    const { error } = await q;
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um bairro com esse nome.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const excluirDeliveryBairroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { error } = await context.supabase
      .from("delivery_bairros")
      .delete()
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
