import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TurnoCaixaStatus = "aberto" | "fechado";
export type MovimentoCaixaTipo = "abertura" | "sangria" | "suprimento" | "fechamento";

export interface TurnoCaixa {
  id: string;
  restaurante_id: string;
  operador_user_id: string;
  operador_nome: string;
  aberto_em: string;
  fechado_em: string | null;
  fundo_inicial: number;
  fundo_final: number | null;
  contagem_fisica: number | null;
  diferenca: number | null;
  obs_fechamento: string | null;
  status: TurnoCaixaStatus;
  snapshot_total_vendas: number | null;
  snapshot_total_dinheiro: number | null;
  snapshot_total_cartao: number | null;
  snapshot_total_pix: number | null;
  snapshot_total_fiado: number | null;
  snapshot_total_outro: number | null;
  snapshot_total_sangrias: number | null;
  snapshot_total_suprimentos: number | null;
  snapshot_qtd_pedidos: number | null;
}

export interface MovimentoCaixa {
  id: string;
  turno_id: string;
  restaurante_id: string;
  tipo: MovimentoCaixaTipo;
  valor: number;
  motivo: string | null;
  operador_user_id: string;
  criado_em: string;
}

export interface TotaisTurno {
  fundo_inicial: number;
  total_vendas: number;
  total_dinheiro: number;
  total_cartao: number;
  total_pix: number;
  total_fiado: number;
  total_outro: number;
  total_sangrias: number;
  total_suprimentos: number;
  qtd_pedidos: number;
  saldo_esperado: number;
}

const SELECT_TURNO =
  "id, restaurante_id, operador_user_id, operador_nome, aberto_em, fechado_em, fundo_inicial, fundo_final, contagem_fisica, diferenca, obs_fechamento, status, snapshot_total_vendas, snapshot_total_dinheiro, snapshot_total_cartao, snapshot_total_pix, snapshot_total_fiado, snapshot_total_outro, snapshot_total_sangrias, snapshot_total_suprimentos, snapshot_qtd_pedidos";

/**
 * Carrega o papel do usuário no restaurante e se ele é platform admin.
 * Usado para os gates de mutação do caixa.
 */
async function getContextoPermissaoCaixa(
  supabase: SupabaseClient<Database>,
  userId: string,
  restauranteId: string,
) {
  const [{ data: membro }, { data: pa }] = await Promise.all([
    supabase
      .from("restaurante_membros")
      .select("papel")
      .eq("user_id", userId)
      .eq("restaurante_id", restauranteId)
      .maybeSingle(),
    supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  return {
    papel: (membro?.papel ?? null) as
      | "admin"
      | "caixa"
      | "staff"
      | "cozinheiro"
      | "bar"
      | null,
    isPlatformAdmin: !!pa,
  };
}

async function getOperadorNome(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

type CaixaEventoTipo =
  | "abrir"
  | "sangria"
  | "suprimento"
  | "pagamento_confirmado"
  | "fechar"
  | "assumir"
  | "aviso_teto";

async function gravarEventoCaixa(args: {
  restauranteId: string;
  turnoId: string;
  tipo: CaixaEventoTipo;
  atorUserId: string;
  atorNome: string | null;
  payload?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("caixa_eventos").insert({
    restaurante_id: args.restauranteId,
    turno_id: args.turnoId,
    tipo: args.tipo,
    payload: (args.payload ?? {}) as never,
    ator_user_id: args.atorUserId,
    ator_nome: args.atorNome,
  });
}

export const obterTurnoAtivoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<TurnoCaixa | null> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: row, error } = await supabase
      .from("turnos_caixa")
      .select(SELECT_TURNO)
      .eq("restaurante_id", data.restauranteId)
      .eq("status", "aberto")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as TurnoCaixa | null) ?? null;
  });

export const listarTurnosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<TurnoCaixa[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("turnos_caixa")
      .select(SELECT_TURNO)
      .eq("restaurante_id", data.restauranteId)
      .order("aberto_em", { ascending: false })
      .limit(data.limit ?? 30);
    if (error) throw new Error(error.message);
    return (rows ?? []) as TurnoCaixa[];
  });

export const obterTotaisTurnoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), turnoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<TotaisTurno> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: res, error } = await supabase.rpc("totais_turno_caixa", {
      _turno_id: data.turnoId,
    });
    if (error) throw new Error(error.message);
    const t = (res ?? {}) as Record<string, number | string>;
    const n = (v: unknown) => Number(v ?? 0);
    return {
      fundo_inicial: n(t.fundo_inicial),
      total_vendas: n(t.total_vendas),
      total_dinheiro: n(t.total_dinheiro),
      total_cartao: n(t.total_cartao),
      total_pix: n(t.total_pix),
      total_fiado: n(t.total_fiado),
      total_outro: n(t.total_outro),
      total_sangrias: n(t.total_sangrias),
      total_suprimentos: n(t.total_suprimentos),
      qtd_pedidos: Number(t.qtd_pedidos ?? 0),
      saldo_esperado: n(t.saldo_esperado),
    };
  });

export const listarMovimentosTurnoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), turnoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<MovimentoCaixa[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("movimentos_caixa")
      .select("id, turno_id, restaurante_id, tipo, valor, motivo, operador_user_id, criado_em")
      .eq("turno_id", data.turnoId)
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as MovimentoCaixa[];
  });

export const abrirCaixaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      operadorNome: z.string().trim().min(1).max(120),
      fundoInicial: z.number().min(0).max(1_000_000),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const ctx = await getContextoPermissaoCaixa(supabase, userId, data.restauranteId);
    if (ctx.isPlatformAdmin && ctx.papel !== "admin" && ctx.papel !== "caixa") {
      throw new Error("Super-admin não pode abrir caixa.");
    }
    if (ctx.papel !== "admin" && ctx.papel !== "caixa") {
      throw new Error("Apenas usuários com papel admin ou caixa podem abrir o caixa.");
    }
    // Bloqueio de turno duplicado (Bloco 5)
    const { data: aberto } = await supabase
      .from("turnos_caixa")
      .select("id")
      .eq("restaurante_id", data.restauranteId)
      .eq("status", "aberto")
      .maybeSingle();
    if (aberto) {
      throw new Error("Já existe um turno aberto para este restaurante.");
    }
    const { data: id, error } = await supabase.rpc("abrir_turno_caixa", {
      _restaurante_id: data.restauranteId,
      _operador_nome: data.operadorNome,
      _fundo_inicial: data.fundoInicial,
    });
    if (error) throw new Error(error.message);
    const turnoId = id as unknown as string;
    await gravarEventoCaixa({
      restauranteId: data.restauranteId,
      turnoId,
      tipo: "abrir",
      atorUserId: userId,
      atorNome: data.operadorNome,
      payload: { fundo_inicial: data.fundoInicial },
    });
    return { id: turnoId };
  });

export const registrarMovimentoCaixaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      turnoId: z.string().uuid(),
      tipo: z.enum(["sangria", "suprimento"]),
      valor: z.number().positive().max(1_000_000),
      motivo: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    // Gate "dono do turno" (Bloco 3)
    const { data: turno } = await supabase
      .from("turnos_caixa")
      .select("operador_user_id, status")
      .eq("id", data.turnoId)
      .maybeSingle();
    if (!turno || turno.status !== "aberto") {
      throw new Error("Turno não está aberto.");
    }
    if (turno.operador_user_id !== userId) {
      throw new Error("Apenas o operador do turno pode realizar esta ação.");
    }
    const { data: id, error } = await supabase.rpc("registrar_movimento_caixa", {
      _turno_id: data.turnoId,
      _tipo: data.tipo,
      _valor: data.valor,
      _motivo: data.motivo ?? "",
    });
    if (error) throw new Error(error.message);
    const nome = await getOperadorNome(userId);
    await gravarEventoCaixa({
      restauranteId: data.restauranteId,
      turnoId: data.turnoId,
      tipo: data.tipo,
      atorUserId: userId,
      atorNome: nome,
      payload: { valor: data.valor, motivo: data.motivo ?? null },
    });
    return { id: id as unknown as string };
  });

export const fecharCaixaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      turnoId: z.string().uuid(),
      contagemFisica: z.number().min(0).max(10_000_000),
      fundoFinal: z.number().min(0).max(1_000_000),
      obsFechamento: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    // Gate "dono do turno" (Bloco 3)
    const { data: turno } = await supabase
      .from("turnos_caixa")
      .select("operador_user_id, status")
      .eq("id", data.turnoId)
      .maybeSingle();
    if (!turno || turno.status !== "aberto") {
      throw new Error("Turno não está aberto.");
    }
    if (turno.operador_user_id !== userId) {
      throw new Error("Apenas o operador do turno pode fechar o caixa.");
    }
    const { data: res, error } = await supabase.rpc("fechar_turno_caixa", {
      _turno_id: data.turnoId,
      _contagem_fisica: data.contagemFisica,
      _fundo_final: data.fundoFinal,
      _obs: data.obsFechamento ?? "",
    });
    if (error) throw new Error(error.message);
    const nome = await getOperadorNome(userId);
    await gravarEventoCaixa({
      restauranteId: data.restauranteId,
      turnoId: data.turnoId,
      tipo: "fechar",
      atorUserId: userId,
      atorNome: nome,
      payload: {
        contagem_fisica: data.contagemFisica,
        fundo_final: data.fundoFinal,
      },
    });
    return res as unknown as { diferenca: number; totais: TotaisTurno };
  });

/**
 * Assume a propriedade de um turno aberto.
 * Restrito a usuários com papel "admin" do restaurante (não super-admin, não caixa).
 */
export const assumirTurnoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        turnoId: z.string().uuid(),
        novoOperadorNome: z.string().trim().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const ctx = await getContextoPermissaoCaixa(supabase, userId, data.restauranteId);
    if (ctx.papel !== "admin") {
      throw new Error("Apenas um admin do restaurante pode assumir o turno.");
    }

    const { data: turno, error: tErr } = await supabase
      .from("turnos_caixa")
      .select("operador_user_id, operador_nome, status")
      .eq("id", data.turnoId)
      .eq("restaurante_id", data.restauranteId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!turno || turno.status !== "aberto") {
      throw new Error("Turno não está aberto.");
    }
    if (turno.operador_user_id === userId) {
      return { ok: true, already: true };
    }

    const operadorAnteriorNome = turno.operador_nome;
    const operadorAnteriorUserId = turno.operador_user_id;

    const { error: uErr } = await supabaseAdmin
      .from("turnos_caixa")
      .update({
        operador_user_id: userId,
        operador_nome: data.novoOperadorNome,
      })
      .eq("id", data.turnoId);
    if (uErr) throw new Error(uErr.message);

    await gravarEventoCaixa({
      restauranteId: data.restauranteId,
      turnoId: data.turnoId,
      tipo: "assumir",
      atorUserId: userId,
      atorNome: data.novoOperadorNome,
      payload: {
        operador_anterior_user_id: operadorAnteriorUserId,
        operador_anterior_nome: operadorAnteriorNome,
      },
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "assumir_turno_caixa",
      entidade: "turno_caixa",
      entidade_id: data.turnoId,
      metadata: {
        restaurante_id: data.restauranteId,
        operador_anterior_user_id: operadorAnteriorUserId,
        operador_anterior_nome: operadorAnteriorNome,
        novo_operador_nome: data.novoOperadorNome,
      } as never,
    });

    return { ok: true, already: false };
  });