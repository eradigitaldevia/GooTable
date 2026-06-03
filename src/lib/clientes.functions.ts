import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  criarComandaIndividual,
  garantirSessaoAberta,
  listarComandasAtivas,
  vincularClienteSessao,
  type ComandaResumo,
  detectarConflitoMesa,
  type ConflitoMesa,
} from "./sessoes.server";

export interface ClienteIdentificado {
  id: string;
  nome: string;
  telefone: string;
  cashback_saldo: number;
}

export type IdentificarResultado =
  | {
      cliente: ClienteIdentificado;
      conflito: ConflitoMesa;
      sessao_id?: undefined;
      mesa_id?: undefined;
      restaurante_id?: undefined;
      comandas_ativas?: undefined;
    }
  | {
      cliente: ClienteIdentificado;
      conflito?: undefined;
      sessao_id: string;
      mesa_id: string;
      restaurante_id: string;
      comandas_ativas: ComandaResumo[];
    };

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

    // Bloqueio: cliente já está em outra mesa do mesmo restaurante.
    const conflito = await detectarConflitoMesa(
      cliente.id,
      mesa.restaurante_id,
      mesa.id,
    );
    if (conflito) {
      return { cliente, conflito };
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

    // Sempre individual: cada cliente entra com sua própria comanda.
    // Reusa se já existir vínculo ativo (re-identificação idempotente).
    const { data: vincExistente } = await supabaseAdmin
      .from("mesa_sessao_clientes")
      .select("comanda_id")
      .eq("sessao_id", sessao.id)
      .eq("cliente_id", data.clienteId)
      .is("saiu_em", null)
      .maybeSingle();
    let comandaId: string | null = null;
    if (vincExistente?.comanda_id) {
      const { data: comExist } = await supabaseAdmin
        .from("comandas")
        .select("id, status")
        .eq("id", vincExistente.comanda_id as string)
        .maybeSingle();
      if (comExist && comExist.status === "aberta") {
        comandaId = comExist.id as string;
      }
    }
    if (!comandaId) {
      comandaId = await criarComandaIndividual(
        sessao.id,
        mesa.restaurante_id,
        data.clienteId,
      );
    }
    await vincularClienteSessao(sessao.id, data.clienteId, comandaId);
    return { comanda_id: comandaId, escolha: "separada" as const };
  });

/* ---------- Público: Minha Conta do cliente ---------- */

export interface VisitaResumo {
  sessao_id: string;
  mesa_numero: string | null;
  aberta_em: string;
  fechada_em: string | null;
  status: string;
  pedidos_count: number;
  total_cliente: number;
  cashback_gerado: number;
  cashback_resgatado: number;
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
  visitas: VisitaResumo[];
  visitas_total: number;
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

    // Histórico de visitas (agrupado por mesa_sessao), excluindo a sessão atual
    const { data: pedsAll, error: pErr } = await supabaseAdmin
      .from("pedidos")
      .select("id, sessao_id, total, cashback_gerado, cashback_resgatado, criado_em")
      .eq("restaurante_id", mesa.restaurante_id)
      .eq("cliente_id", data.clienteId)
      .not("sessao_id", "is", null)
      .neq("sessao_id", data.sessaoId);
    if (pErr) throw new Error(pErr.message);

    const grupos = new Map<
      string,
      {
        pedidos_count: number;
        total_cliente: number;
        cashback_gerado: number;
        cashback_resgatado: number;
      }
    >();
    for (const p of pedsAll ?? []) {
      const sid = p.sessao_id as string;
      const g = grupos.get(sid) ?? {
        pedidos_count: 0,
        total_cliente: 0,
        cashback_gerado: 0,
        cashback_resgatado: 0,
      };
      g.pedidos_count += 1;
      g.total_cliente += Number(p.total ?? 0);
      g.cashback_gerado += Number(p.cashback_gerado ?? 0);
      g.cashback_resgatado += Number(p.cashback_resgatado ?? 0);
      grupos.set(sid, g);
    }

    const sessaoIds = Array.from(grupos.keys());
    let visitas: VisitaResumo[] = [];
    if (sessaoIds.length) {
      const { data: sessoes, error: sErr } = await supabaseAdmin
        .from("mesa_sessoes")
        .select("id, mesa_id, aberta_em, fechada_em, status")
        .in("id", sessaoIds);
      if (sErr) throw new Error(sErr.message);
      const mesaIds = Array.from(
        new Set((sessoes ?? []).map((s) => s.mesa_id as string)),
      );
      const mesasMap = new Map<string, string>();
      if (mesaIds.length) {
        const { data: mesasRows, error: msErr } = await supabaseAdmin
          .from("mesas")
          .select("id, numero")
          .in("id", mesaIds);
        if (msErr) throw new Error(msErr.message);
        for (const m of mesasRows ?? []) {
          mesasMap.set(m.id as string, m.numero as string);
        }
      }
      visitas = (sessoes ?? []).map((s) => {
        const g = grupos.get(s.id as string)!;
        return {
          sessao_id: s.id as string,
          mesa_numero: mesasMap.get(s.mesa_id as string) ?? null,
          aberta_em: s.aberta_em as string,
          fechada_em: (s.fechada_em as string | null) ?? null,
          status: s.status as string,
          pedidos_count: g.pedidos_count,
          total_cliente: g.total_cliente,
          cashback_gerado: g.cashback_gerado,
          cashback_resgatado: g.cashback_resgatado,
        };
      });
      visitas.sort((a, b) => (a.aberta_em < b.aberta_em ? 1 : -1));
    }

    const visitasTotal = visitas.length;
    const fromIdx = data.page * data.pageSize;
    const toIdx = fromIdx + data.pageSize;
    const visitasPage = visitas.slice(fromIdx, toIdx);

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
      visitas: visitasPage,
      visitas_total: visitasTotal,
    };
  });

export interface DetalheVisitaResultado {
  sessao: {
    id: string;
    mesa_numero: string | null;
    aberta_em: string;
    fechada_em: string | null;
    status: string;
  };
  pedidos: Array<{
    id: string;
    criado_em: string;
    status: string;
    observacao: string | null;
    cashback_gerado: number;
    cashback_resgatado: number;
    itens: Array<{
      nome_produto: string;
      quantidade: number;
      preco_unit: number;
      subtotal: number;
      observacao: string | null;
    }>;
    subtotal_cliente: number;
  }>;
  totais: {
    subtotal_cliente: number;
    cashback_gerado: number;
    cashback_resgatado: number;
    total_pago_sessao: number;
  };
}

export const detalheVisitaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        clienteId: z.string().uuid(),
        sessaoId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<DetalheVisitaResultado> => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa) throw new Error("Mesa indisponível");

    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, mesa_id, restaurante_id, aberta_em, fechada_em, status")
      .eq("id", data.sessaoId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sessao || sessao.restaurante_id !== mesa.restaurante_id) {
      throw new Error("Visita inválida");
    }

    const { data: mesaRow, error: mrErr } = await supabaseAdmin
      .from("mesas")
      .select("numero")
      .eq("id", sessao.mesa_id as string)
      .maybeSingle();
    if (mrErr) throw new Error(mrErr.message);

    const { data: peds, error: pErr } = await supabaseAdmin
      .from("pedidos")
      .select("id, criado_em, status, observacao, cashback_gerado, cashback_resgatado")
      .eq("sessao_id", data.sessaoId)
      .eq("cliente_id", data.clienteId)
      .order("criado_em", { ascending: true });
    if (pErr) throw new Error(pErr.message);

    const pedidoIds = (peds ?? []).map((p) => p.id as string);
    const itensPorPedido = new Map<
      string,
      Array<{
        nome_produto: string;
        quantidade: number;
        preco_unit: number;
        subtotal: number;
        observacao: string | null;
      }>
    >();
    if (pedidoIds.length) {
      const { data: itens, error: iErr } = await supabaseAdmin
        .from("pedido_itens")
        .select("pedido_id, nome_produto, quantidade, preco_unit, observacao")
        .in("pedido_id", pedidoIds)
        .eq("cliente_id", data.clienteId);
      if (iErr) throw new Error(iErr.message);
      for (const it of itens ?? []) {
        const pid = it.pedido_id as string;
        const qtd = Number(it.quantidade ?? 0);
        const pu = Number(it.preco_unit ?? 0);
        const arr = itensPorPedido.get(pid) ?? [];
        arr.push({
          nome_produto: it.nome_produto as string,
          quantidade: qtd,
          preco_unit: pu,
          subtotal: pu * qtd,
          observacao: (it.observacao as string | null) ?? null,
        });
        itensPorPedido.set(pid, arr);
      }
    }

    const { data: pags, error: pgErr } = await supabaseAdmin
      .from("pagamentos")
      .select("valor, status")
      .eq("sessao_id", data.sessaoId);
    if (pgErr) throw new Error(pgErr.message);
    const totalPagoSessao = (pags ?? [])
      .filter((p) => p.status === "confirmado")
      .reduce((acc, p) => acc + Number(p.valor ?? 0), 0);

    let subtotalCliente = 0;
    let cashbackGerado = 0;
    let cashbackResgatado = 0;
    const pedidos = (peds ?? []).map((p) => {
      const itens = itensPorPedido.get(p.id as string) ?? [];
      const sub = itens.reduce((a, i) => a + i.subtotal, 0);
      subtotalCliente += sub;
      cashbackGerado += Number(p.cashback_gerado ?? 0);
      cashbackResgatado += Number(p.cashback_resgatado ?? 0);
      return {
        id: p.id as string,
        criado_em: p.criado_em as string,
        status: p.status as string,
        observacao: (p.observacao as string | null) ?? null,
        cashback_gerado: Number(p.cashback_gerado ?? 0),
        cashback_resgatado: Number(p.cashback_resgatado ?? 0),
        itens,
        subtotal_cliente: sub,
      };
    });

    return {
      sessao: {
        id: sessao.id as string,
        mesa_numero: (mesaRow?.numero as string | undefined) ?? null,
        aberta_em: sessao.aberta_em as string,
        fechada_em: (sessao.fechada_em as string | null) ?? null,
        status: sessao.status as string,
      },
      pedidos,
      totais: {
        subtotal_cliente: subtotalCliente,
        cashback_gerado: cashbackGerado,
        cashback_resgatado: cashbackResgatado,
        total_pago_sessao: totalPagoSessao,
      },
    };
  });
