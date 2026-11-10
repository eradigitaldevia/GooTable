import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import type { FaixaKm, FalhaDistancia, ModeloKm } from "./taxa-distancia";

export type ModoTaxa = "fixa" | "bairro" | "distancia";

export interface ConfigDistancia {
  modo: ModoTaxa;
  origemEndereco: string | null;
  origemLocalizada: boolean;
  raioKm: number | null;
  modelo: ModeloKm;
  faixas: FaixaKm[];
  baseValor: number;
  baseKm: number;
  valorKmExtra: number;
  falha: FalhaDistancia;
}

const idSchema = z.object({ restauranteId: z.string().uuid() });

export const obterConfigDistanciaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<ConfigDistancia> => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { data: r, error } = await context.supabase
      .from("restaurantes")
      .select(
        "delivery_modo_taxa, delivery_origem_endereco, delivery_origem_lat, delivery_origem_lng, delivery_raio_km, delivery_km_modelo, delivery_km_faixas, delivery_km_base_valor, delivery_km_base_km, delivery_km_valor_extra, delivery_km_falha",
      )
      .eq("id", data.restauranteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!r) throw new Error("Restaurante não encontrado");
    return {
      modo: r.delivery_modo_taxa as ModoTaxa,
      origemEndereco: r.delivery_origem_endereco,
      origemLocalizada: r.delivery_origem_lat != null && r.delivery_origem_lng != null,
      raioKm: r.delivery_raio_km == null ? null : Number(r.delivery_raio_km),
      modelo: r.delivery_km_modelo as ModeloKm,
      faixas: Array.isArray(r.delivery_km_faixas)
        ? (r.delivery_km_faixas as unknown as FaixaKm[]).map((f) => ({ ate_km: Number(f.ate_km), taxa: Number(f.taxa) }))
        : [],
      baseValor: Number(r.delivery_km_base_valor),
      baseKm: Number(r.delivery_km_base_km),
      valorKmExtra: Number(r.delivery_km_valor_extra),
      falha: r.delivery_km_falha as FalhaDistancia,
    };
  });

export const salvarModoTaxaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.extend({ modo: z.enum(["fixa", "bairro", "distancia"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.modo === "distancia") {
      const { data: r } = await supabaseAdmin
        .from("restaurantes")
        .select("delivery_origem_lat")
        .eq("id", data.restauranteId)
        .maybeSingle();
      if (r?.delivery_origem_lat == null) {
        throw new Error("Localize o endereço de saída do restaurante antes de ativar a taxa por distância.");
      }
    }
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({ delivery_modo_taxa: data.modo, delivery_taxa_por_bairro: data.modo === "bairro" })
      .eq("id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const faixaSchema = z.object({ ate_km: z.number().positive().max(200), taxa: z.number().min(0).max(500) });

export const salvarConfigDistanciaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    idSchema
      .extend({
        modelo: z.enum(["faixas", "base_km"]),
        faixas: z.array(faixaSchema).max(20),
        baseValor: z.number().min(0).max(500),
        baseKm: z.number().min(0).max(200),
        valorKmExtra: z.number().min(0).max(100),
        falha: z.enum(["taxa_fixa", "bloquear"]),
        raioKm: z.number().positive().max(200).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({
        delivery_km_modelo: data.modelo,
        delivery_km_faixas: [...data.faixas].sort((a, b) => a.ate_km - b.ate_km),
        delivery_km_base_valor: data.baseValor,
        delivery_km_base_km: data.baseKm,
        delivery_km_valor_extra: data.valorKmExtra,
        delivery_km_falha: data.falha,
        delivery_raio_km: data.raioKm,
      })
      .eq("id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const enderecoSchema = z.object({
  cep: z.string().max(9).optional().nullable(),
  rua: z.string().trim().min(1).max(150),
  numero: z.string().trim().min(1).max(20),
  bairro: z.string().trim().max(80).default(""),
  cidade: z.string().trim().min(1).max(80),
  uf: z.string().trim().length(2),
});

/** Admin: localiza o endereço de saída do restaurante (uma consulta ao salvar). */
export const localizarOrigemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.extend({ endereco: enderecoSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { geocodificar, enderecoTexto } = await import("./delivery-distancia.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const geo = await geocodificar(enderecoTexto(data.endereco));
    if (!geo) throw new Error("Endereço não encontrado. Confira rua, número e cidade.");
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({
        delivery_origem_endereco: geo.formatado,
        delivery_origem_lat: geo.lat,
        delivery_origem_lng: geo.lng,
      })
      .eq("id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { formatado: geo.formatado };
  });

export type CalculoEntregaPublico =
  | { ok: true; distanciaKm: number | null; taxa: number }
  | { ok: false; erro: string };

/** Público (checkout): calcula distância e taxa. Usa cache e limites de uso. */
export const calcularDistanciaEntregaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i), endereco: enderecoSchema })
      .parse(d),
  )
  .handler(async ({ data }): Promise<CalculoEntregaPublico> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolverEntregaPorDistancia, idVisitante } = await import("./delivery-distancia.server");
    const { data: r, error } = await supabaseAdmin
      .from("restaurantes")
      .select("*")
      .eq("delivery_slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!r || !r.ativo || !r.delivery_ativo) return { ok: false, erro: "Delivery indisponível" };
    if (r.delivery_modo_taxa !== "distancia") return { ok: false, erro: "Taxa por distância desativada" };
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0];
    const res = await resolverEntregaPorDistancia(r, data.endereco, await idVisitante(ip));
    if (!res.ok) return { ok: false, erro: res.erro };
    return { ok: true, distanciaKm: res.distanciaKm, taxa: res.taxa };
  });