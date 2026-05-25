import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  criarComandaIndividual,
  garantirComandaCompartilhada,
  garantirSessaoAberta,
  listarComandasAtivas,
  vincularClienteSessao,
  type ComandaResumo,
} from "./sessoes.server";

export interface ClienteIdentificado {
  id: string;
  nome: string;
  telefone: string;
  cashback_saldo: number;
}

export interface IdentificarResultado {
  cliente: ClienteIdentificado;
  sessao_id: string;
  mesa_id: string;
  restaurante_id: string;
  comandas_ativas: ComandaResumo[];
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const nomeSchema = z
  .string()
  .trim()
  .min(2, "Nome muito curto")
  .max(80, "Nome muito longo");

const telefoneSchema = z
  .string()
  .transform(onlyDigits)
  .pipe(
    z
      .string()
      .min(10, "Telefone inválido")
      .max(15, "Telefone inválido"),
  );

/**
 * Identifica o cliente no QR da mesa. Faz upsert em `clientes`,
 * garante sessão aberta da mesa e devolve as comandas ativas.
 */
export const identificarClienteFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        nome: nomeSchema,
        telefone: telefoneSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<IdentificarResultado> => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id, ativa")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa || !mesa.ativa) throw new Error("Mesa indisponível");

    const { data: rest, error: rErr } = await supabaseAdmin
      .from("restaurantes")
      .select("ativo")
      .eq("id", mesa.restaurante_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!rest?.ativo) throw new Error("Restaurante indisponível");

    const agora = new Date().toISOString();

    const { data: existente, error: selErr } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, telefone, cashback_saldo")
      .eq("restaurante_id", mesa.restaurante_id)
      .eq("telefone", data.telefone)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    let cliente: ClienteIdentificado;
    if (existente) {
      const { data: upd, error: upErr } = await supabaseAdmin
        .from("clientes")
        .update({ nome: data.nome, ultima_visita: agora })
        .eq("id", existente.id)
        .select("id, nome, telefone, cashback_saldo")
        .single();
      if (upErr || !upd) throw new Error(upErr?.message ?? "Falha ao atualizar cliente");
      cliente = {
        id: upd.id as string,
        nome: upd.nome as string,
        telefone: upd.telefone as string,
        cashback_saldo: Number(upd.cashback_saldo ?? 0),
      };
    } else {
      const { data: ins, error: insErr } = await supabaseAdmin
        .from("clientes")
        .insert({
          restaurante_id: mesa.restaurante_id,
          nome: data.nome,
          telefone: data.telefone,
          ultima_visita: agora,
        })
        .select("id, nome, telefone, cashback_saldo")
        .single();
      if (insErr || !ins) throw new Error(insErr?.message ?? "Falha ao criar cliente");
      cliente = {
        id: ins.id as string,
        nome: ins.nome as string,
        telefone: ins.telefone as string,
        cashback_saldo: Number(ins.cashback_saldo ?? 0),
      };
    }

    const sessao = await garantirSessaoAberta(mesa.id, mesa.restaurante_id);
    const comandas = await listarComandasAtivas(sessao.id);

    return {
      cliente,
      sessao_id: sessao.id,
      mesa_id: mesa.id,
      restaurante_id: mesa.restaurante_id,
      comandas_ativas: comandas,
    };
  });

/**
 * Vincula o cliente a uma comanda da sessão.
 * - escolha = "participar": entra na comanda compartilhada (cria/usa existente).
 * - escolha = "separada": cria nova comanda individual para o cliente.
 * - escolha = "auto": se houver outras comandas, cai em participar; senão cria individual.
 */
export const entrarNaMesaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        clienteId: z.string().uuid(),
        sessaoId: z.string().uuid(),
        escolha: z.enum(["participar", "separada", "auto"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id, ativa")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa || !mesa.ativa) throw new Error("Mesa indisponível");

    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, mesa_id, restaurante_id, status")
      .eq("id", data.sessaoId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sessao || sessao.status !== "aberta" || sessao.mesa_id !== mesa.id) {
      throw new Error("Sessão da mesa indisponível");
    }

    const { data: cliente, error: cErr } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("id", data.clienteId)
      .eq("restaurante_id", mesa.restaurante_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cliente) throw new Error("Cliente não encontrado");

    let comandaId: string;
    let escolhaEfetiva = data.escolha;
    if (escolhaEfetiva === "auto") {
      const ativas = await listarComandasAtivas(sessao.id);
      escolhaEfetiva = ativas.length > 0 ? "participar" : "separada";
    }

    if (escolhaEfetiva === "participar") {
      comandaId = await garantirComandaCompartilhada(sessao.id, mesa.restaurante_id);
    } else {
      comandaId = await criarComandaIndividual(sessao.id, mesa.restaurante_id, data.clienteId);
    }

    await vincularClienteSessao(sessao.id, data.clienteId, comandaId);

    return { comanda_id: comandaId, escolha: escolhaEfetiva };
  });

/* ---------- Público: Minha Conta do cliente ---------- */

export interface PedidoHistorico {
  id: string;
  total: number;
  status: string;
  criado_em: string;
}

export interface MinhaContaResultado {
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    cashback_saldo: number;
    total_gasto: number;
    pedidos_count: number;
    ticket_medio: number;
    ultima_visita: string | null;
  };
  meu_subtotal_na_comanda: number;
  meu_consumo_na_sessao: number;
  cashback_resgatado_comanda: number;
  programa: {
    ativo: boolean;
    percentual_cashback: number;
    percentual_max_resgate: number;
  };
  historico: PedidoHistorico[];
  historico_total: number;
}

export const minhaContaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        clienteId: z.string().uuid(),
        comandaId: z.string().uuid(),
        sessaoId: z.string().uuid(),
        page: z.number().int().min(0).max(1000).default(0),
        pageSize: z.number().int().min(1).max(50).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<MinhaContaResultado> => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa) throw new Error("Mesa indisponível");

    const { data: cli, error: cErr } = await supabaseAdmin
      .from("clientes")
      .select(
        "id, nome, telefone, cashback_saldo, total_gasto, pedidos_count, ticket_medio, ultima_visita, restaurante_id",
      )
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cli || cli.restaurante_id !== mesa.restaurante_id) {
      throw new Error("Cliente inválido");
    }

    // Pedidos da sessão atual (para somar consumo na sessão)
    const { data: pedsSessao, error: psErr } = await supabaseAdmin
      .from("pedidos")
      .select("id, comanda_id")
      .eq("sessao_id", data.sessaoId);
    if (psErr) throw new Error(psErr.message);

    const pedidoIdsSessao = (pedsSessao ?? []).map((p) => p.id as string);
    const pedidoIdsComanda = (pedsSessao ?? [])
      .filter((p) => (p.comanda_id as string | null) === data.comandaId)
      .map((p) => p.id as string);

    let meuConsumoSessao = 0;
    let meuSubtotalComanda = 0;
    if (pedidoIdsSessao.length) {
      const { data: itens, error: iErr } = await supabaseAdmin
        .from("pedido_itens")
        .select("pedido_id, preco_unit, quantidade")
        .in("pedido_id", pedidoIdsSessao)
        .eq("cliente_id", data.clienteId);
      if (iErr) throw new Error(iErr.message);
      const comandaSet = new Set(pedidoIdsComanda);
      for (const it of itens ?? []) {
        const sub = Number(it.preco_unit) * (it.quantidade as number);
        meuConsumoSessao += sub;
        if (comandaSet.has(it.pedido_id as string)) {
          meuSubtotalComanda += sub;
        }
      }
    }

    // Cashback resgatado na comanda atual
    const { data: comandaAtual, error: caErr } = await supabaseAdmin
      .from("comandas")
      .select("cashback_resgatado")
      .eq("id", data.comandaId)
      .maybeSingle();
    if (caErr) throw new Error(caErr.message);

    // Programa de fidelidade
    const { data: prog, error: prErr } = await supabaseAdmin
      .from("programa_fidelidade")
      .select("ativo, percentual_cashback, percentual_max_resgate")
      .eq("restaurante_id", mesa.restaurante_id)
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prErr) throw new Error(prErr.message);

    // Histórico paginado de pedidos do cliente neste restaurante
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: hist, error: hErr, count } = await supabaseAdmin
      .from("pedidos")
      .select("id, total, status, criado_em", { count: "exact" })
      .eq("restaurante_id", mesa.restaurante_id)
      .eq("cliente_id", data.clienteId)
      .order("criado_em", { ascending: false })
      .range(from, to);
    if (hErr) throw new Error(hErr.message);

    return {
      cliente: {
        id: cli.id as string,
        nome: cli.nome as string,
        telefone: cli.telefone as string,
        cashback_saldo: Number(cli.cashback_saldo ?? 0),
        total_gasto: Number(cli.total_gasto ?? 0),
        pedidos_count: Number(cli.pedidos_count ?? 0),
        ticket_medio: Number(cli.ticket_medio ?? 0),
        ultima_visita: (cli.ultima_visita as string | null) ?? null,
      },
      meu_subtotal_na_comanda: meuSubtotalComanda,
      meu_consumo_na_sessao: meuConsumoSessao,
      cashback_resgatado_comanda: Number(comandaAtual?.cashback_resgatado ?? 0),
      programa: {
        ativo: Boolean(prog?.ativo),
        percentual_cashback: Number(prog?.percentual_cashback ?? 0),
        percentual_max_resgate: Number(prog?.percentual_max_resgate ?? 100),
      },
      historico: (hist ?? []).map((p) => ({
        id: p.id as string,
        total: Number(p.total ?? 0),
        status: p.status as string,
        criado_em: p.criado_em as string,
      })),
      historico_total: count ?? 0,
    };
  });
