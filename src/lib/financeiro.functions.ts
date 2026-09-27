import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export type TipoLancamento = "pagar" | "receber";
export type StatusLancamento = "pendente" | "pago" | "cancelado";

export interface CategoriaFinanceira {
  id: string;
  tipo: "receita" | "despesa";
  nome: string;
  cor: string | null;
  padrao: boolean;
}
export interface Fornecedor {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
}
export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  categoria_id: string | null;
  categoria_nome: string | null;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  valor: number;
  data_vencimento: string;
  data_competencia: string;
  data_pagamento: string | null;
  status: StatusLancamento;
  forma_pagamento: string | null;
  observacao: string | null;
  origem: string;
}
export interface ResumoFinanceiro {
  a_pagar: number;
  a_receber: number;
  pago: number;
  recebido: number;
  vencidos_pagar: number;
  vencidos_receber: number;
  qtd_vencidos: number;
  a_pagar_hoje: number;
  a_pagar_semana: number;
  faturamento: number;
  saldo_periodo: number;
}
export interface LinhaCategoria {
  categoria: string;
  valor: number;
}
export interface Dre {
  receita_vendas: number;
  outras_receitas: number;
  receitas_categorias: LinhaCategoria[];
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  cmv: number;
  margem_contribuicao: number;
  despesas_operacionais: LinhaCategoria[];
  total_despesas_operacionais: number;
  resultado_liquido: number;
}
export interface LinhaFluxo {
  periodo: string;
  entradas_previstas: number;
  saidas_previstas: number;
  entradas_realizadas: number;
  saidas_realizadas: number;
  saldo_previsto: number;
  saldo_realizado: number;
}

const uuid = z.string().uuid();
const dataStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const periodo = z.object({ restauranteId: uuid, inicio: dataStr, fim: dataStr });

export const obterResumoFinanceiroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodo.parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc("obter_resumo_financeiro" as never, {
      _restaurante_id: data.restauranteId, _inicio: data.inicio, _fim: data.fim,
    } as never);
    if (error) throw new Error((error as { message: string }).message);
    return r as unknown as ResumoFinanceiro;
  });

export const obterDreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodo.parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc("obter_dre_gerencial" as never, {
      _restaurante_id: data.restauranteId, _inicio: data.inicio, _fim: data.fim,
    } as never);
    if (error) throw new Error((error as { message: string }).message);
    return r as unknown as Dre;
  });

export const obterFluxoCaixaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodo.extend({ agrupamento: z.enum(["dia", "mes"]) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc("obter_fluxo_caixa" as never, {
      _restaurante_id: data.restauranteId, _inicio: data.inicio, _fim: data.fim,
      _agrupamento: data.agrupamento,
    } as never);
    if (error) throw new Error((error as { message: string }).message);
    return (r ?? []) as unknown as LinhaFluxo[];
  });

export const integrarRepassesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: n, error } = await context.supabase.rpc(
      "integrar_repasses_caixa_financeiro" as never,
      { _restaurante_id: data.restauranteId } as never,
    );
    if (error) throw new Error((error as { message: string }).message);
    return { count: (n as unknown as number) ?? 0 };
  });

export const listarLancamentosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    periodo.extend({
      tipo: z.enum(["pagar", "receber"]),
      status: z.enum(["todos", "pendente", "pago", "cancelado", "vencido"]).default("todos"),
      categoriaId: uuid.optional(),
      fornecedorId: uuid.optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabase
      .from("lancamentos_financeiros" as never)
      .select("*, categorias_financeiras(nome), fornecedores_financeiro(nome)")
      .eq("restaurante_id", data.restauranteId)
      .eq("tipo", data.tipo)
      .gte("data_vencimento", data.inicio)
      .lte("data_vencimento", data.fim)
      .order("data_vencimento", { ascending: true })
      .limit(1000);
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    if (data.status === "vencido") q = q.eq("status", "pendente").lt("data_vencimento", hoje);
    else if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.categoriaId) q = q.eq("categoria_id", data.categoriaId);
    if (data.fornecedorId) q = q.eq("fornecedor_id", data.fornecedorId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      tipo: r.tipo,
      descricao: r.descricao,
      categoria_id: r.categoria_id,
      categoria_nome: (r.categorias_financeiras as { nome: string } | null)?.nome ?? null,
      fornecedor_id: r.fornecedor_id,
      fornecedor_nome: (r.fornecedores_financeiro as { nome: string } | null)?.nome ?? null,
      valor: Number(r.valor),
      data_vencimento: r.data_vencimento,
      data_competencia: r.data_competencia,
      data_pagamento: r.data_pagamento,
      status: r.status,
      forma_pagamento: r.forma_pagamento,
      observacao: r.observacao,
      origem: r.origem,
    })) as Lancamento[];
  });

const lancamentoInput = z.object({
  restauranteId: uuid,
  id: uuid.optional(),
  tipo: z.enum(["pagar", "receber"]),
  descricao: z.string().trim().min(1).max(200),
  categoriaId: uuid.nullable(),
  fornecedorId: uuid.nullable(),
  valor: z.number().positive().max(100_000_000),
  dataVencimento: dataStr,
  dataCompetencia: dataStr,
  formaPagamento: z.string().max(40).nullable(),
  observacao: z.string().max(500).nullable(),
});

export const salvarLancamentoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => lancamentoInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const row = {
      restaurante_id: data.restauranteId,
      tipo: data.tipo,
      descricao: data.descricao,
      categoria_id: data.categoriaId,
      fornecedor_id: data.fornecedorId,
      valor: data.valor,
      data_vencimento: data.dataVencimento,
      data_competencia: data.dataCompetencia,
      forma_pagamento: data.formaPagamento,
      observacao: data.observacao,
    };
    const t = supabase.from("lancamentos_financeiros" as never);
    const { error } = data.id
      ? await t.update(row as never).eq("id", data.id).eq("restaurante_id", data.restauranteId)
      : await t.insert({ ...row, criado_por: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const alterarStatusLancamentoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: uuid,
      id: uuid,
      acao: z.enum(["baixar", "estornar", "cancelar", "excluir"]),
      dataPagamento: dataStr.optional(),
      formaPagamento: z.string().max(40).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const t = supabase.from("lancamentos_financeiros" as never);
    let res;
    if (data.acao === "excluir") {
      res = await t.delete().eq("id", data.id).eq("restaurante_id", data.restauranteId).eq("origem", "manual");
    } else {
      const upd =
        data.acao === "baixar"
          ? { status: "pago", data_pagamento: data.dataPagamento, forma_pagamento: data.formaPagamento ?? null }
          : data.acao === "estornar"
            ? { status: "pendente", data_pagamento: null }
            : { status: "cancelado", data_pagamento: null };
      if (data.acao === "baixar" && !data.dataPagamento) throw new Error("Informe a data de pagamento");
      res = await t.update(upd as never).eq("id", data.id).eq("restaurante_id", data.restauranteId);
    }
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const listarCadastrosFinanceiroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const [cats, forns] = await Promise.all([
      supabase.from("categorias_financeiras" as never).select("id, tipo, nome, cor, padrao")
        .eq("restaurante_id", data.restauranteId).order("nome"),
      supabase.from("fornecedores_financeiro" as never).select("id, nome, cnpj_cpf, telefone, email")
        .eq("restaurante_id", data.restauranteId).order("nome"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (forns.error) throw new Error(forns.error.message);
    return {
      categorias: (cats.data ?? []) as unknown as CategoriaFinanceira[],
      fornecedores: (forns.data ?? []) as unknown as Fornecedor[],
    };
  });

export const salvarCategoriaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: uuid,
      id: uuid.optional(),
      tipo: z.enum(["receita", "despesa"]),
      nome: z.string().trim().min(1).max(80),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const t = supabase.from("categorias_financeiras" as never);
    const res = data.id
      ? await t.update({ nome: data.nome } as never).eq("id", data.id).eq("restaurante_id", data.restauranteId)
      : await t.insert({ restaurante_id: data.restauranteId, tipo: data.tipo, nome: data.nome } as never);
    if (res.error) throw new Error(res.error.code === "23505" ? "Categoria já existe" : res.error.message);
    return { ok: true };
  });

export const salvarFornecedorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: uuid,
      id: uuid.optional(),
      nome: z.string().trim().min(1).max(120),
      cnpjCpf: z.string().trim().max(20).nullable(),
      telefone: z.string().trim().max(20).nullable(),
      email: z.string().trim().email().max(255).nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const valores = {
      nome: data.nome, cnpj_cpf: data.cnpjCpf,
      telefone: data.telefone, email: data.email,
    } as never;
    const t = supabase.from("fornecedores_financeiro" as never);
    const res = data.id
      ? await t.update(valores).eq("id", data.id).eq("restaurante_id", data.restauranteId)
      : await t.insert({ restaurante_id: data.restauranteId, ...valores });
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const excluirCadastroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: uuid, id: uuid, tipo: z.enum(["categoria", "fornecedor"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const tabela = data.tipo === "categoria" ? "categorias_financeiras" : "fornecedores_financeiro";
    const { error } = await supabase.from(tabela as never).delete()
      .eq("id", data.id).eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
