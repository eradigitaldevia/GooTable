import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

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
    const { data: id, error } = await supabase.rpc("abrir_turno_caixa", {
      _restaurante_id: data.restauranteId,
      _operador_nome: data.operadorNome,
      _fundo_inicial: data.fundoInicial,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
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
    const { data: id, error } = await supabase.rpc("registrar_movimento_caixa", {
      _turno_id: data.turnoId,
      _tipo: data.tipo,
      _valor: data.valor,
      _motivo: data.motivo ?? null,
    });
    if (error) throw new Error(error.message);
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
    const { data: res, error } = await supabase.rpc("fechar_turno_caixa", {
      _turno_id: data.turnoId,
      _contagem_fisica: data.contagemFisica,
      _fundo_final: data.fundoFinal,
      _obs: data.obsFechamento ?? null,
    });
    if (error) throw new Error(error.message);
    return res as { diferenca: number; totais: TotaisTurno };
  });