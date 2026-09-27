import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export type UnidadeInsumo = "un" | "kg" | "g" | "L" | "ml";
export const UNIDADES: UnidadeInsumo[] = ["un", "kg", "g", "L", "ml"];

export interface Insumo {
  id: string;
  nome: string;
  unidade: UnidadeInsumo;
  custo_medio: number;
  saldo: number;
  estoque_minimo: number;
  bloquear_ao_zerar: boolean;
  is_preparo: boolean;
  ativo: boolean;
}
export interface FichaItem {
  id: string;
  produto_id: string | null;
  preparo_id: string | null;
  insumo_id: string;
  quantidade: number;
}
export interface Movimento {
  id: string;
  insumo_id: string;
  insumo_nome: string;
  unidade: string;
  tipo: string;
  quantidade: number;
  custo_unit: number | null;
  saldo_apos: number;
  observacao: string | null;
  pedido_id: string | null;
  criado_em: string;
}
export interface ResumoEstoque {
  total_insumos: number;
  abaixo_minimo: number;
  zerados: number;
  valor_total: number;
  produtos_bloqueados: number;
  alertas: { id: string; nome: string; unidade: string; saldo: number; estoque_minimo: number; bloquear_ao_zerar: boolean }[];
}
export interface CustoProduto {
  produto_id: string;
  custo: number;
  preco: number;
  margem: number | null;
}

const rid = z.object({ restauranteId: z.string().uuid() });
const num = (v: unknown) => Number(v ?? 0);

export const listarInsumosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rid.parse(d))
  .handler(async ({ context, data }): Promise<Insumo[]> => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { data: rows, error } = await context.supabase
      .from("estoque_insumos")
      .select("id, nome, unidade, custo_medio, saldo, estoque_minimo, bloquear_ao_zerar, is_preparo, ativo")
      .eq("restaurante_id", data.restauranteId)
      .order("nome");
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      ...r,
      unidade: r.unidade as UnidadeInsumo,
      custo_medio: num(r.custo_medio),
      saldo: num(r.saldo),
      estoque_minimo: num(r.estoque_minimo),
    }));
  });

export const salvarInsumoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(80),
        unidade: z.enum(["un", "kg", "g", "L", "ml"]),
        custo_medio: z.number().min(0).max(1_000_000),
        estoque_minimo: z.number().min(0).max(1_000_000),
        bloquear_ao_zerar: z.boolean(),
        is_preparo: z.boolean(),
        ativo: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { restauranteId, id, ...valores } = data;
    const q = id
      ? context.supabase.from("estoque_insumos").update(valores).eq("id", id).eq("restaurante_id", restauranteId)
      : context.supabase.from("estoque_insumos").insert({ ...valores, restaurante_id: restauranteId });
    const { error } = await q;
    if (error) throw new Error(error.code === "23505" ? "Já existe um insumo com esse nome" : error.message);
    return { ok: true };
  });

export const excluirInsumoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid(), id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { count } = await context.supabase
      .from("estoque_fichas")
      .select("id", { count: "exact", head: true })
      .eq("insumo_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error(`Este insumo está em ${count} ficha(s) técnica(s). Remova-o das fichas antes de excluir.`);
    }
    const { error } = await context.supabase
      .from("estoque_insumos")
      .delete()
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarFichasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rid.parse(d))
  .handler(async ({ context, data }): Promise<FichaItem[]> => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { data: rows, error } = await context.supabase
      .from("estoque_fichas")
      .select("id, produto_id, preparo_id, insumo_id, quantidade")
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ ...r, quantidade: num(r.quantidade) }));
  });

/** Substitui a ficha técnica completa de um produto ou preparo. */
export const salvarFichaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        alvo: z.enum(["produto", "preparo"]),
        alvoId: z.string().uuid(),
        itens: z
          .array(z.object({ insumo_id: z.string().uuid(), quantidade: z.number().positive().max(1_000_000) }))
          .max(100),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const col = data.alvo === "produto" ? "produto_id" : "preparo_id";
    if (data.alvo === "preparo" && data.itens.some((i) => i.insumo_id === data.alvoId)) {
      throw new Error("Um preparo não pode conter a si mesmo.");
    }
    const ids = new Set(data.itens.map((i) => i.insumo_id));
    if (ids.size !== data.itens.length) throw new Error("Insumo repetido na ficha.");
    const { error: delErr } = await context.supabase
      .from("estoque_fichas")
      .delete()
      .eq(col, data.alvoId)
      .eq("restaurante_id", data.restauranteId);
    if (delErr) throw new Error(delErr.message);
    if (data.itens.length > 0) {
      const { error } = await context.supabase.from("estoque_fichas").insert(
        data.itens.map((i) => ({
          restaurante_id: data.restauranteId,
          [col]: data.alvoId,
          insumo_id: i.insumo_id,
          quantidade: i.quantidade,
        })) as never,
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listarMovimentosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        insumoId: z.string().uuid().nullable(),
        tipo: z.string().max(20).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<Movimento[]> => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    let q = context.supabase
      .from("estoque_movimentos")
      .select("id, insumo_id, tipo, quantidade, custo_unit, saldo_apos, observacao, pedido_id, criado_em, estoque_insumos(nome, unidade)")
      .eq("restaurante_id", data.restauranteId)
      .gte("criado_em", `${data.inicio}T00:00:00-03:00`)
      .lte("criado_em", `${data.fim}T23:59:59.999-03:00`)
      .order("criado_em", { ascending: false })
      .limit(500);
    if (data.insumoId) q = q.eq("insumo_id", data.insumoId);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const ins = r.estoque_insumos as { nome: string; unidade: string } | null;
      return {
        id: r.id,
        insumo_id: r.insumo_id,
        insumo_nome: ins?.nome ?? "—",
        unidade: ins?.unidade ?? "",
        tipo: r.tipo,
        quantidade: num(r.quantidade),
        custo_unit: r.custo_unit === null ? null : num(r.custo_unit),
        saldo_apos: num(r.saldo_apos),
        observacao: r.observacao,
        pedido_id: r.pedido_id,
        criado_em: r.criado_em,
      };
    });
  });

export const registrarMovimentoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        insumoId: z.string().uuid(),
        tipo: z.enum(["entrada", "perda", "ajuste"]),
        quantidade: z.number().refine((n) => n !== 0 && Math.abs(n) <= 1_000_000),
        custoUnit: z.number().min(0).max(1_000_000).nullable(),
        fornecedorId: z.string().uuid().nullable(),
        observacao: z.string().max(300).nullable(),
        gerarConta: z.boolean(),
        vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { error } = await context.supabase.rpc("estoque_registrar_movimento", {
      _insumo_id: data.insumoId,
      _tipo: data.tipo,
      _quantidade: data.quantidade,
      _custo_unit: data.custoUnit ?? undefined,
      _fornecedor_id: data.fornecedorId ?? undefined,
      _observacao: data.observacao ?? undefined,
      _gerar_conta: data.gerarConta,
      _vencimento: data.vencimento ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const produzirPreparoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        preparoId: z.string().uuid(),
        quantidade: z.number().positive().max(1_000_000),
        observacao: z.string().max(300).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { error } = await context.supabase.rpc("estoque_produzir_preparo", {
      _preparo_id: data.preparoId,
      _quantidade: data.quantidade,
      _observacao: data.observacao ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const aplicarInventarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        itens: z.array(z.object({ insumo_id: z.string().uuid(), contagem: z.number().min(0).max(1_000_000) })).max(1000),
        observacao: z.string().max(300).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { data: n, error } = await context.supabase.rpc("estoque_aplicar_inventario", {
      _restaurante_id: data.restauranteId,
      _itens: data.itens,
      _observacao: data.observacao ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ajustes: Number(n ?? 0) };
  });

export const obterResumoEstoqueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rid.parse(d))
  .handler(async ({ context, data }): Promise<ResumoEstoque> => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { data: r, error } = await context.supabase.rpc("estoque_resumo", { _restaurante_id: data.restauranteId });
    if (error) throw new Error(error.message);
    return r as unknown as ResumoEstoque;
  });

export const obterCustoProdutosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rid.parse(d))
  .handler(async ({ context, data }): Promise<CustoProduto[]> => {
    await assertAcessoRestaurante(context.supabase, context.userId, data.restauranteId);
    const { data: r, error } = await context.supabase.rpc("estoque_custo_produtos", {
      _restaurante_id: data.restauranteId,
    });
    if (error) throw new Error(error.message);
    return ((r as unknown as CustoProduto[]) ?? []).map((c) => ({
      ...c,
      custo: num(c.custo),
      preco: num(c.preco),
      margem: c.margem === null ? null : num(c.margem),
    }));
  });
