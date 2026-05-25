import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CupomTipo = "percentual" | "valor_fixo";

export interface Cupom {
  id: string;
  restaurante_id: string;
  codigo: string;
  tipo: CupomTipo;
  valor: number;
  validade_inicio: string | null;
  validade_fim: string | null;
  uso_max: number | null;
  uso_atual: number;
  ativo: boolean;
  regras_json: { valor_minimo?: number; primeira_compra?: boolean } | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CupomInput {
  codigo: string;
  tipo: CupomTipo;
  valor: number;
  validade_inicio?: string | null;
  validade_fim?: string | null;
  uso_max?: number | null;
  valor_minimo?: number | null;
  primeira_compra?: boolean;
  ativo?: boolean;
}

const cupomInputSchema = z.object({
  codigo: z.string().min(1).max(40),
  tipo: z.enum(["percentual", "valor_fixo"]),
  valor: z.number().positive(),
  validade_inicio: z.string().nullable().optional(),
  validade_fim: z.string().nullable().optional(),
  uso_max: z.number().int().positive().nullable().optional(),
  valor_minimo: z.number().min(0).nullable().optional(),
  primeira_compra: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

function buildRegras(input: CupomInput): Record<string, number | boolean> {
  const r: Record<string, number | boolean> = {};
  if (input.valor_minimo != null && input.valor_minimo > 0) r.valor_minimo = input.valor_minimo;
  if (input.primeira_compra) r.primeira_compra = true;
  return r;
}

export const listarCuponsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<Cupom[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("cupons")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Cupom[];
  });

export const criarCupomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), input: cupomInputSchema }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.from("cupons").insert({
      restaurante_id: data.restauranteId,
      codigo: data.input.codigo.trim(),
      tipo: data.input.tipo,
      valor: data.input.valor,
      validade_inicio: data.input.validade_inicio ?? null,
      validade_fim: data.input.validade_fim ?? null,
      uso_max: data.input.uso_max ?? null,
      ativo: data.input.ativo ?? true,
      regras_json: buildRegras(data.input),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarCupomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      cupomId: z.string().uuid(),
      input: cupomInputSchema,
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("cupons")
      .update({
        codigo: data.input.codigo.trim(),
        tipo: data.input.tipo,
        valor: data.input.valor,
        validade_inicio: data.input.validade_inicio ?? null,
        validade_fim: data.input.validade_fim ?? null,
        uso_max: data.input.uso_max ?? null,
        ativo: data.input.ativo ?? true,
        regras_json: buildRegras(data.input),
      })
      .eq("id", data.cupomId)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirCupomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), cupomId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("cupons")
      .delete()
      .eq("id", data.cupomId)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Cliente público (via QR): aplicar / remover cupom em comanda ---

export const aplicarCupomComandaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      qrToken: z.string().min(1).max(80),
      comandaId: z.string().uuid(),
      clienteId: z.string().uuid().nullable().optional(),
      codigo: z.string().min(1).max(40),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    // valida que a comanda pertence à mesa do qrToken
    const { data: comanda, error: cErr } = await supabaseAdmin
      .from("comandas")
      .select("id, sessao_id, restaurante_id")
      .eq("id", data.comandaId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!comanda) throw new Error("Comanda não encontrada");

    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("mesa_id")
      .eq("id", comanda.sessao_id as string)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    const { data: mesa } = await supabaseAdmin
      .from("mesas")
      .select("qr_token")
      .eq("id", sessao?.mesa_id as string)
      .maybeSingle();
    if (!mesa || mesa.qr_token !== data.qrToken) throw new Error("Mesa inválida");

    const { data: res, error } = await supabaseAdmin.rpc("aplicar_cupom_comanda", {
      _comanda_id: data.comandaId,
      _codigo: data.codigo,
      _cliente_id: data.clienteId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as {
      valido: boolean;
      motivo?: string;
      desconto?: number;
      codigo?: string;
    };
  });

export const removerCupomComandaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      qrToken: z.string().min(1).max(80),
      comandaId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: comanda } = await supabaseAdmin
      .from("comandas")
      .select("id, sessao_id")
      .eq("id", data.comandaId)
      .maybeSingle();
    if (!comanda) throw new Error("Comanda não encontrada");
    const { data: sessao } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("mesa_id")
      .eq("id", comanda.sessao_id as string)
      .maybeSingle();
    const { data: mesa } = await supabaseAdmin
      .from("mesas")
      .select("qr_token")
      .eq("id", sessao?.mesa_id as string)
      .maybeSingle();
    if (!mesa || mesa.qr_token !== data.qrToken) throw new Error("Mesa inválida");

    const { error } = await supabaseAdmin.rpc("remover_cupom_comanda", {
      _comanda_id: data.comandaId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
