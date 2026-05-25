import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface TipoChamado {
  id: string;
  restaurante_id: string;
  nome: string;
  icone: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ChamadoComTipo {
  id: string;
  restaurante_id: string;
  mesa_id: string;
  comanda_id: string | null;
  cliente_id: string | null;
  tipo_chamado_id: string;
  status: "pendente" | "atendido" | "cancelado";
  criado_em: string;
  atendido_em: string | null;
  atendido_por: string | null;
  tempo_atendimento_segundos: number | null;
  tipo_nome: string;
  tipo_icone: string;
  mesa_numero: string;
}

export interface MetricasChamados {
  pendentes: number;
  atendidos_hoje: number;
  tempo_medio_segundos: number;
  por_hora: Array<{ hora: number; total: number }>;
}

const tipoInputSchema = z.object({
  nome: z.string().min(1).max(60),
  icone: z.string().min(1).max(40),
  ordem: z.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
});

// ===== Tipos de chamado (admin) =====

export const listarTiposChamadoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<TipoChamado[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("tipos_chamado")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("ordem");
    if (error) throw new Error(error.message);
    return (rows ?? []) as TipoChamado[];
  });

export const criarTipoChamadoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), input: tipoInputSchema }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.from("tipos_chamado").insert({
      restaurante_id: data.restauranteId,
      nome: data.input.nome.trim(),
      icone: data.input.icone,
      ordem: data.input.ordem ?? 0,
      ativo: data.input.ativo ?? true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarTipoChamadoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      tipoId: z.string().uuid(),
      input: tipoInputSchema,
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("tipos_chamado")
      .update({
        nome: data.input.nome.trim(),
        icone: data.input.icone,
        ordem: data.input.ordem ?? 0,
        ativo: data.input.ativo ?? true,
      })
      .eq("id", data.tipoId)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirTipoChamadoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), tipoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("tipos_chamado")
      .delete()
      .eq("id", data.tipoId)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Tipos públicos (cardápio) =====

export const listarTiposPublicoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ qrToken: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }): Promise<TipoChamado[]> => {
    const { data: mesa } = await supabaseAdmin
      .from("mesas")
      .select("restaurante_id")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (!mesa) return [];
    const { data: rows, error } = await supabaseAdmin
      .from("tipos_chamado")
      .select("*")
      .eq("restaurante_id", mesa.restaurante_id as string)
      .eq("ativo", true)
      .order("ordem");
    if (error) throw new Error(error.message);
    return (rows ?? []) as TipoChamado[];
  });

// ===== Criar chamado (público via QR) =====

export const criarChamadoFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      qrToken: z.string().min(1).max(80),
      tipoChamadoId: z.string().uuid(),
      comandaId: z.string().uuid().nullable().optional(),
      sessaoId: z.string().uuid().nullable().optional(),
      clienteId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: mesa } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id, ativa")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (!mesa) throw new Error("Mesa não encontrada");
    if (!mesa.ativa) throw new Error("Mesa inativa");

    const { data: tipo } = await supabaseAdmin
      .from("tipos_chamado")
      .select("id, ativo, restaurante_id")
      .eq("id", data.tipoChamadoId)
      .maybeSingle();
    if (!tipo || tipo.restaurante_id !== mesa.restaurante_id || !tipo.ativo) {
      throw new Error("Tipo de chamado inválido");
    }

    // Anti-spam: rejeita se há pendente do mesmo tipo na mesma mesa há menos de 2 min
    const limite = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: existente } = await supabaseAdmin
      .from("chamados_garcom")
      .select("id")
      .eq("mesa_id", mesa.id as string)
      .eq("tipo_chamado_id", data.tipoChamadoId)
      .eq("status", "pendente")
      .gte("criado_em", limite)
      .maybeSingle();
    if (existente) {
      return { ok: false, motivo: "Já solicitado, aguarde um instante." };
    }

    const { error } = await supabaseAdmin.from("chamados_garcom").insert({
      restaurante_id: mesa.restaurante_id as string,
      mesa_id: mesa.id as string,
      comanda_id: data.comandaId ?? null,
      sessao_id: data.sessaoId ?? null,
      cliente_id: data.clienteId ?? null,
      tipo_chamado_id: data.tipoChamadoId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Listar / atender (admin) =====

export const listarChamadosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      apenasPendentes: z.boolean().optional(),
      limite: z.number().int().min(1).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<ChamadoComTipo[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let query = supabase
      .from("chamados_garcom")
      .select(
        "id, restaurante_id, mesa_id, comanda_id, cliente_id, tipo_chamado_id, status, criado_em, atendido_em, atendido_por, tempo_atendimento_segundos",
      )
      .eq("restaurante_id", data.restauranteId)
      .order("criado_em", { ascending: false })
      .limit(data.limite ?? 100);
    if (data.apenasPendentes) query = query.eq("status", "pendente");
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const tipoIds = Array.from(new Set((rows ?? []).map((r) => r.tipo_chamado_id)));
    const mesaIds = Array.from(new Set((rows ?? []).map((r) => r.mesa_id)));

    const [{ data: tipos }, { data: mesas }] = await Promise.all([
      tipoIds.length
        ? supabase.from("tipos_chamado").select("id, nome, icone").in("id", tipoIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string; icone: string }> }),
      mesaIds.length
        ? supabase.from("mesas").select("id, numero").in("id", mesaIds)
        : Promise.resolve({ data: [] as Array<{ id: string; numero: string }> }),
    ]);

    const tipoMap = new Map((tipos ?? []).map((t) => [t.id, t]));
    const mesaMap = new Map((mesas ?? []).map((m) => [m.id, m]));

    return (rows ?? []).map((r) => {
      const t = tipoMap.get(r.tipo_chamado_id);
      const m = mesaMap.get(r.mesa_id);
      return {
        id: r.id,
        restaurante_id: r.restaurante_id,
        mesa_id: r.mesa_id,
        comanda_id: r.comanda_id,
        cliente_id: r.cliente_id,
        tipo_chamado_id: r.tipo_chamado_id,
        status: r.status,
        criado_em: r.criado_em,
        atendido_em: r.atendido_em,
        atendido_por: r.atendido_por,
        tempo_atendimento_segundos: r.tempo_atendimento_segundos,
        tipo_nome: t?.nome ?? "—",
        tipo_icone: t?.icone ?? "bell",
        mesa_numero: m?.numero ?? "—",
      };
    });
  });

export const atenderChamadoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), chamadoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("chamados_garcom")
      .update({ status: "atendido", atendido_por: userId })
      .eq("id", data.chamadoId)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const metricasChamadosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<MetricasChamados> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: res, error } = await supabase.rpc("metricas_chamados", {
      _restaurante_id: data.restauranteId,
    });
    if (error) throw new Error(error.message);
    return res as unknown as MetricasChamados;
  });
