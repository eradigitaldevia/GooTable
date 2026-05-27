import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import type { Json } from "@/integrations/supabase/types";

export type GarcomMetaTipo = "faturamento" | "pedidos" | "horario";
export type GarcomMetaPeriodo = "diario" | "semanal" | "mensal";
export type GarcomBonusStatus = "pendente" | "pago";

export interface GarcomMeta {
  id: string;
  restaurante_id: string;
  garcom_id: string;
  garcom_nome: string;
  nome: string;
  tipo: GarcomMetaTipo;
  periodo: GarcomMetaPeriodo;
  alvo: number;
  bonus_valor: number;
  bonus_percentual: number;
  regras_json: Json;
  ativo: boolean;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface GarcomBonus {
  id: string;
  restaurante_id: string;
  garcom_id: string;
  garcom_nome: string;
  meta_id: string;
  meta_nome: string;
  meta_tipo: GarcomMetaTipo;
  periodo_ref: string;
  valor: number;
  detalhe_json: Json;
  status: GarcomBonusStatus;
  calculado_em: string;
  pago_em: string | null;
}

const regrasSchema = z
  .object({
    hora_inicio: z.number().int().min(0).max(23).optional(),
    hora_fim: z.number().int().min(1).max(24).optional(),
    dias_semana: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .partial()
  .passthrough();

/* ---------- Metas (CRUD) ---------- */

export const listarMetasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("garcom_metas")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.garcom_id)));
    const nomes = new Map<string, string>();
    if (ids.length > 0) {
      const { data: gs } = await supabase
        .from("garcons")
        .select("id, nome")
        .in("id", ids);
      for (const g of gs ?? []) nomes.set(g.id, g.nome);
    }
    return (rows ?? []).map((r) => {
      return {
        id: r.id,
        restaurante_id: r.restaurante_id,
        garcom_id: r.garcom_id,
        garcom_nome: nomes.get(r.garcom_id) ?? "—",
        nome: r.nome,
        tipo: r.tipo as GarcomMetaTipo,
        periodo: r.periodo as GarcomMetaPeriodo,
        alvo: Number(r.alvo),
        bonus_valor: Number(r.bonus_valor),
        bonus_percentual: Number(r.bonus_percentual),
        regras_json: (r.regras_json ?? {}) as Json,
        ativo: r.ativo,
        vigencia_inicio: r.vigencia_inicio,
        vigencia_fim: r.vigencia_fim,
        criado_em: r.criado_em,
        atualizado_em: r.atualizado_em,
      } as GarcomMeta;
    });
  });

const metaInputSchema = z.object({
  restauranteId: z.string().uuid(),
  garcomId: z.string().uuid(),
  nome: z.string().min(1).max(120),
  tipo: z.enum(["faturamento", "pedidos", "horario"]),
  periodo: z.enum(["diario", "semanal", "mensal"]).default("mensal"),
  alvo: z.number().min(0),
  bonusValor: z.number().min(0).default(0),
  bonusPercentual: z.number().min(0).max(100).default(0),
  regras: regrasSchema.optional(),
  ativo: z.boolean().default(true),
  vigenciaInicio: z.string().optional().nullable(),
  vigenciaFim: z.string().optional().nullable(),
});

export const criarMetaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => metaInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: row, error } = await supabase
      .from("garcom_metas")
      .insert({
        restaurante_id: data.restauranteId,
        garcom_id: data.garcomId,
        nome: data.nome.trim(),
        tipo: data.tipo,
        periodo: data.periodo,
        alvo: data.alvo,
        bonus_valor: data.bonusValor,
        bonus_percentual: data.bonusPercentual,
        regras_json: data.regras ?? {},
        ativo: data.ativo,
        vigencia_inicio: data.vigenciaInicio || null,
        vigencia_fim: data.vigenciaFim || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const atualizarMetaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    metaInputSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("garcom_metas")
      .update({
        garcom_id: data.garcomId,
        nome: data.nome.trim(),
        tipo: data.tipo,
        periodo: data.periodo,
        alvo: data.alvo,
        bonus_valor: data.bonusValor,
        bonus_percentual: data.bonusPercentual,
        regras_json: data.regras ?? {},
        ativo: data.ativo,
        vigencia_inicio: data.vigenciaInicio || null,
        vigencia_fim: data.vigenciaFim || null,
      })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirMetaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("garcom_metas")
      .delete()
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Bônus ---------- */

export const listarBonusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        status: z.enum(["pendente", "pago", "todos"]).default("pendente"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabase
      .from("garcom_bonus")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("periodo_ref", { ascending: false })
      .limit(500);
    if (data.status !== "todos") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const garcomIds = Array.from(new Set((rows ?? []).map((r) => r.garcom_id)));
    const metaIds = Array.from(new Set((rows ?? []).map((r) => r.meta_id)));
    const gNomes = new Map<string, string>();
    const metas = new Map<string, { nome: string; tipo: GarcomMetaTipo }>();
    if (garcomIds.length > 0) {
      const { data: gs } = await supabase.from("garcons").select("id, nome").in("id", garcomIds);
      for (const g of gs ?? []) gNomes.set(g.id, g.nome);
    }
    if (metaIds.length > 0) {
      const { data: ms } = await supabase
        .from("garcom_metas")
        .select("id, nome, tipo")
        .in("id", metaIds);
      for (const m of ms ?? []) metas.set(m.id, { nome: m.nome, tipo: m.tipo as GarcomMetaTipo });
    }
    return (rows ?? []).map((r) => {
      const meta = metas.get(r.meta_id);
      return {
        id: r.id,
        restaurante_id: r.restaurante_id,
        garcom_id: r.garcom_id,
        garcom_nome: gNomes.get(r.garcom_id) ?? "—",
        meta_id: r.meta_id,
        meta_nome: meta?.nome ?? "—",
        meta_tipo: (meta?.tipo ?? "faturamento") as GarcomMetaTipo,
        periodo_ref: r.periodo_ref,
        valor: Number(r.valor),
        detalhe_json: (r.detalhe_json ?? {}) as Json,
        status: r.status as GarcomBonusStatus,
        calculado_em: r.calculado_em,
        pago_em: r.pago_em,
      } as GarcomBonus;
    });
  });

export const calcularBonusRestauranteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        periodoRef: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: count, error } = await supabase.rpc("calcular_bonus_restaurante", {
      _restaurante_id: data.restauranteId,
      _periodo_ref: data.periodoRef ?? new Date().toISOString().slice(0, 10),
    });
    if (error) throw new Error(error.message);
    return { count: Number(count ?? 0) };
  });

export const pagarBonusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: count, error } = await supabase.rpc("pagar_bonus", { _ids: data.ids });
    if (error) throw new Error(error.message);
    return { count: Number(count ?? 0) };
  });