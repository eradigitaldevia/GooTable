import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { assertAcessoRestaurante } from "./auth.server";
import { sanitizarComandasOrfas, assertClienteNaSessao } from "./sessoes.server";
import { inicioDoDia, fimDoDia } from "./data-fuso";

export type StatusPedido =
  | "recebido"
  | "em_preparo"
  | "pronto"
  | "entregue"
  | "cancelado";

export interface Pedido {
  id: string;
  status: StatusPedido;
  total: number;
  observacao: string | null;
  criado_em: string;
  mesa_id: string;
  restaurante_id: string;
  comanda_id: string | null;
  garcom_id: string | null;
  canal?: string;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  taxa_entrega?: number | null;
  endereco_cep?: string | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_referencia?: string | null;
}
export interface PedidoItem {
  id: string;
  pedido_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
  status: "pendente" | "em_preparo" | "pronto";
  quantidade_pronta: number;
  destino?: "cozinha" | "bar";
}
export interface MesaResumo {
  id: string;
  numero: string;
}

export interface DestinoStatus {
  pedido_id: string;
  destino: "cozinha" | "bar";
  status: StatusPedido;
}

/* ---------- Admin: pedidos do dia + itens + mesas ---------- */

export const listarPedidosDoDiaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const inicio = inicioDoDia();

    const { data: peds, error: pErr } = await supabase
      .from("pedidos")
      .select(
        "id, status, total, observacao, criado_em, mesa_id, restaurante_id, comanda_id, garcom_id, canal, cliente_nome, cliente_telefone, taxa_entrega, endereco_cep, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, endereco_referencia",
      )
      .eq("restaurante_id", data.restauranteId)
      .gte("criado_em", inicio.toISOString())
      .order("criado_em", { ascending: true });
    if (pErr) throw new Error(pErr.message);
    const pedidos = (peds ?? []) as Pedido[];

    const ids = pedidos.map((p) => p.id);
    let itens: PedidoItem[] = [];
    if (ids.length) {
      const { data: its, error: iErr } = await supabase
        .from("pedido_itens")
        .select("id, pedido_id, nome_produto, quantidade, preco_unit, observacao, cliente_nome, status, quantidade_pronta, destino")
        .in("pedido_id", ids);
      if (iErr) throw new Error(iErr.message);
      itens = (its ?? []) as PedidoItem[];
    }

    const { data: ms, error: mErr } = await supabase
      .from("mesas")
      .select("id, numero")
      .eq("restaurante_id", data.restauranteId);
    if (mErr) throw new Error(mErr.message);

    let destinoStatus: DestinoStatus[] = [];
    if (ids.length) {
      const { data: ds, error: dErr } = await supabase
        .from("pedido_destino_status")
        .select("pedido_id, destino, status")
        .in("pedido_id", ids);
      if (dErr) throw new Error(dErr.message);
      destinoStatus = (ds ?? []) as DestinoStatus[];
    }

    return {
      pedidos,
      itens,
      mesas: (ms ?? []) as MesaResumo[],
      destinoStatus,
    };
  });

export const buscarItensPedidoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pedidoId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: its, error } = await supabase
      .from("pedido_itens")
      .select("id, pedido_id, nome_produto, quantidade, preco_unit, observacao, cliente_nome, status, quantidade_pronta, destino")
      .eq("pedido_id", data.pedidoId);
    if (error) throw new Error(error.message);
    return (its ?? []) as PedidoItem[];
  });

export const atualizarStatusPedidoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      restauranteId: z.string().uuid(),
      status: z.enum(["recebido", "em_preparo", "pronto", "entregue", "cancelado"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const update: TablesUpdate<"pedidos"> = {
      status: data.status,
      atualizado_em: new Date().toISOString(),
    };
    if (data.status === "entregue") {
      update.entregue_em = new Date().toISOString();
      // Se o usuário logado é um garçom do restaurante, registra o
      // garçom que cobriu a entrega. Cumins usam um endpoint próprio
      // (confirmarEntregaCumimFn) que grava entregue_por_cumim_id.
      const { data: garcom } = await supabase
        .from("garcons")
        .select("id")
        .eq("user_id", userId)
        .eq("restaurante_id", data.restauranteId)
        .eq("ativo", true)
        .maybeSingle();
      if (garcom?.id) update.entregue_por_garcom_id = garcom.id as string;
    }
    const { error } = await supabase
      .from("pedidos")
      .update(update)
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);

    if (data.status === "entregue") {
      const { error: rpcErr } = await supabaseAdmin.rpc("creditar_cashback_pedido", {
        _pedido_id: data.id,
      });
      if (rpcErr) throw new Error(rpcErr.message);
    }

    return { ok: true };
  });

/* ---------- KDS por destino (cozinha/bar) ---------- */

export const atualizarStatusDestinoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        pedidoId: z.string().uuid(),
        destino: z.enum(["cozinha", "bar"]),
        status: z.enum(["recebido", "em_preparo", "pronto"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("atualizar_status_destino", {
      _pedido_id: data.pedidoId,
      _destino: data.destino,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Cancelamento (garçom/admin): pedido inteiro ou item individual ---------- */

export const cancelarPedidoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      pedidoId: z.string().uuid(),
      restauranteId: z.string().uuid(),
      motivo: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.rpc("cancelar_pedido", {
      _pedido_id: data.pedidoId,
      _motivo: data.motivo ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelarItemPedidoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      itemId: z.string().uuid(),
      restauranteId: z.string().uuid(),
      motivo: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.rpc("cancelar_item_pedido", {
      _item_id: data.itemId,
      _motivo: data.motivo ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Público (cliente via QR): criar pedido + status ---------- */

const itemSchema = z.object({
  produto_id: z.string().uuid(),
  nome: z.string().min(1).max(200),
  preco: z.number().min(0),
  quantidade: z.number().int().min(1).max(99),
  observacao: z.string().max(300).optional(),
  cliente_nome: z.string().max(80).optional(),
  cliente_id: z.string().uuid().optional(),
});

/** Cria pedido + itens (público). Total é calculado no servidor. */
export const criarPedidoPublicoFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      qrToken: z.string().min(1).max(80),
      clienteId: z.string().uuid(),
      comandaId: z.string().uuid(),
      sessaoId: z.string().uuid(),
      itens: z.array(itemSchema).min(1).max(60),
      observacao: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
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

    // Valida sessão pertence à mesa e está aberta
    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, mesa_id, status")
      .eq("id", data.sessaoId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sessao || sessao.mesa_id !== mesa.id || sessao.status !== "aberta") {
      throw new Error("Sessão da mesa indisponível");
    }

    // Valida comanda pertence à sessão e está aberta
    const { data: comanda, error: coErr } = await supabaseAdmin
      .from("comandas")
      .select("id, sessao_id, status, restaurante_id")
      .eq("id", data.comandaId)
      .maybeSingle();
    if (coErr) throw new Error(coErr.message);
    if (
      !comanda ||
      comanda.sessao_id !== sessao.id ||
      comanda.status !== "aberta" ||
      comanda.restaurante_id !== mesa.restaurante_id
    ) {
      throw new Error("Comanda indisponível");
    }

    // Valida cliente pertence ao restaurante
    const { data: cli, error: cErr } = await supabaseAdmin
      .from("clientes")
      .select("id, restaurante_id")
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cli || cli.restaurante_id !== mesa.restaurante_id) {
      throw new Error("Cliente inválido");
    }

    // Total calculado no backend a partir do preço atual (anti-tampering).
    const ids = Array.from(new Set(data.itens.map((i) => i.produto_id)));
    const { data: prods, error: pErr } = await supabaseAdmin
      .from("produtos")
      .select("id, preco, disponivel, restaurante_id, nome")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);

    const precoMap = new Map<string, { preco: number; disponivel: boolean; nome: string }>();
    for (const p of prods ?? []) {
      if (p.restaurante_id !== mesa.restaurante_id) {
        throw new Error("Produto não pertence a este restaurante");
      }
      precoMap.set(p.id, { preco: Number(p.preco), disponivel: p.disponivel, nome: p.nome });
    }

    let total = 0;
    const itensPayload = data.itens.map((it) => {
      const real = precoMap.get(it.produto_id);
      if (!real) throw new Error(`Produto ${it.nome} indisponível`);
      if (!real.disponivel) throw new Error(`Produto ${real.nome} indisponível`);
      total += real.preco * it.quantidade;
      return {
        produto_id: it.produto_id,
        nome_produto: real.nome,
        quantidade: it.quantidade,
        preco_unit: real.preco,
        observacao: it.observacao ?? "",
        cliente_nome: it.cliente_nome ?? "",
        cliente_id: it.cliente_id ?? data.clienteId,
      };
    });

    const { data: pedidoId, error: rpcErr } = await supabaseAdmin.rpc(
      "criar_pedido_publico",
      {
        _restaurante_id: mesa.restaurante_id,
        _mesa_id: mesa.id,
        _sessao_id: data.sessaoId,
        _comanda_id: data.comandaId,
        _cliente_id: data.clienteId,
        _observacao: data.observacao ?? "",
        _total: total,
        _itens: itensPayload,
      },
    );
    if (rpcErr || !pedidoId) {
      throw new Error(rpcErr?.message ?? "Falha ao criar pedido");
    }

    return { id: pedidoId as string };
  });

/* ---------- Público: resumo da conta da comanda/mesa ---------- */

export interface ResumoItemConta {
  cliente_id: string | null;
  cliente_nome: string | null;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  subtotal: number;
}
export interface ResumoComanda {
  id: string;
  tipo: "individual" | "compartilhada";
  total: number;
  subtotal: number;
  cashback_resgatado: number;
  total_pago: number;
  desconto_cupom: number;
  cupom_codigo: string | null;
  itens: ResumoItemConta[];
  por_cliente: { cliente_id: string; cliente_nome: string; subtotal: number }[];
  couverts: {
    id: string;
    tipo: "mesa" | "artistico";
    quantidade: number;
    valor_unitario: number;
    total: number;
    descricao: string | null;
  }[];
}
export interface ResumoConta {
  comanda_atual: ResumoComanda | null;
  meu_subtotal_na_comanda: number;
  total_mesa: number;
  comandas_da_mesa: { id: string; tipo: "individual" | "compartilhada"; total: number }[];
  taxa_servico_habilitada: boolean;
  taxa_servico_percentual: number;
  taxa_servico_valor: number;
  taxa_servico_descricao: string | null;
  total_sugerido: number;
}

export const resumoContaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      qrToken: z.string().min(1).max(80),
      clienteId: z.string().uuid(),
      comandaId: z.string().uuid(),
      sessaoId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<ResumoConta> => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa) throw new Error("Mesa indisponível");

    const { data: rest } = await supabaseAdmin
      .from("restaurantes")
      .select(
        "taxa_servico_habilitada, taxa_servico_percentual, taxa_servico_descricao",
      )
      .eq("id", mesa.restaurante_id as string)
      .maybeSingle();

    await assertClienteNaSessao(data.sessaoId, data.clienteId);

    // Comandas da sessão
    const { data: comandas, error: cErr } = await supabaseAdmin
      .from("comandas")
      .select("id, tipo, subtotal, cashback_resgatado, total, total_pago, desconto_cupom, cupom_id, taxa_servico_valor")
      .eq("sessao_id", data.sessaoId)
      .eq("status", "aberta");
    if (cErr) throw new Error(cErr.message);
    const lista = (comandas ?? []) as Array<{
      id: string;
      tipo: "individual" | "compartilhada";
      subtotal: number;
      cashback_resgatado: number;
      total: number;
      total_pago: number;
      desconto_cupom: number;
      cupom_id: string | null;
      taxa_servico_valor: number;
    }>;

    const atual = lista.find((c) => c.id === data.comandaId) ?? null;

    // Itens da comanda atual
    let comandaAtual: ResumoComanda | null = null;
    let meuSubtotal = 0;
    if (atual) {
      const { data: peds, error: pErr } = await supabaseAdmin
        .from("pedidos")
        .select("id")
        .eq("comanda_id", atual.id);
      if (pErr) throw new Error(pErr.message);
      const pedidoIds = (peds ?? []).map((p) => p.id as string);

      let itens: ResumoItemConta[] = [];
      if (pedidoIds.length) {
        const { data: its, error: iErr } = await supabaseAdmin
          .from("pedido_itens")
          .select("cliente_id, cliente_nome, nome_produto, quantidade, preco_unit")
          .in("pedido_id", pedidoIds);
        if (iErr) throw new Error(iErr.message);
        itens = (its ?? []).map((it) => ({
          cliente_id: (it.cliente_id as string | null) ?? null,
          cliente_nome: (it.cliente_nome as string | null) ?? null,
          nome_produto: it.nome_produto as string,
          quantidade: it.quantidade as number,
          preco_unit: Number(it.preco_unit),
          subtotal: Number(it.preco_unit) * (it.quantidade as number),
        }));
      }

      // Resolve nomes dos clientes autores que não tenham cliente_nome no item
      const clienteIds = Array.from(
        new Set(itens.map((i) => i.cliente_id).filter((v): v is string => !!v)),
      );
      const nomesPorId = new Map<string, string>();
      if (clienteIds.length) {
        const { data: cs } = await supabaseAdmin
          .from("clientes")
          .select("id, nome")
          .in("id", clienteIds);
        for (const c of cs ?? []) {
          nomesPorId.set(c.id as string, c.nome as string);
        }
      }

      const grupoMap = new Map<string, { cliente_id: string; cliente_nome: string; subtotal: number }>();
      for (const it of itens) {
        const cid = it.cliente_id ?? "sem";
        const nome =
          (it.cliente_id && nomesPorId.get(it.cliente_id)) ||
          it.cliente_nome ||
          "Sem identificação";
        const cur = grupoMap.get(cid) ?? { cliente_id: cid, cliente_nome: nome, subtotal: 0 };
        cur.subtotal += it.subtotal;
        cur.cliente_nome = nome;
        grupoMap.set(cid, cur);
        if (it.cliente_id === data.clienteId) {
          meuSubtotal += it.subtotal;
        }
      }

      let cupomCodigo: string | null = null;
      if (atual.cupom_id) {
        const { data: cup } = await supabaseAdmin
          .from("cupons")
          .select("codigo")
          .eq("id", atual.cupom_id)
          .maybeSingle();
        cupomCodigo = (cup?.codigo as string | undefined) ?? null;
      }

      comandaAtual = {
        id: atual.id,
        tipo: atual.tipo,
        total: Number(atual.total),
        subtotal: Number(atual.subtotal),
        cashback_resgatado: Number(atual.cashback_resgatado),
        total_pago: Number(atual.total_pago ?? 0),
        desconto_cupom: Number(atual.desconto_cupom ?? 0),
        cupom_codigo: cupomCodigo,
        itens,
        por_cliente: Array.from(grupoMap.values()),
        couverts: [],
      };

      const { data: covs } = await supabaseAdmin
        .from("comanda_couverts")
        .select("id, tipo, quantidade, valor_unitario, descricao")
        .eq("comanda_id", atual.id)
        .order("criado_em", { ascending: true });
      comandaAtual.couverts = (covs ?? []).map((c) => {
        const q = Number(c.quantidade);
        const v = Number(c.valor_unitario);
        return {
          id: c.id as string,
          tipo: c.tipo as "mesa" | "artistico",
          quantidade: q,
          valor_unitario: v,
          total: q * v,
          descricao: (c.descricao as string | null) ?? null,
        };
      });
    }

    const totalMesa = lista.reduce((acc, c) => acc + Number(c.total ?? 0), 0);

    const taxaHab = !!rest?.taxa_servico_habilitada;
    const taxaPerc = Number(rest?.taxa_servico_percentual ?? 0);
    // O total da comanda já é mantido pelo banco com taxa de serviço incluída.
    const taxaValor = taxaHab ? Number(atual?.taxa_servico_valor ?? 0) : 0;
    const totalSugerido = comandaAtual ? Number(comandaAtual.total) : 0;


    return {
      comanda_atual: comandaAtual,
      meu_subtotal_na_comanda: meuSubtotal,
      total_mesa: totalMesa,
      comandas_da_mesa: lista.map((c) => ({
        id: c.id,
        tipo: c.tipo,
        total: Number(c.total ?? 0),
      })),
      taxa_servico_habilitada: taxaHab,
      taxa_servico_percentual: taxaPerc,
      taxa_servico_valor: taxaValor,
      taxa_servico_descricao: (rest?.taxa_servico_descricao as string | null) ?? null,
      total_sugerido: totalSugerido,
    };
  });

export interface RestaurantePix {
  nome: string;
  pix_habilitado: boolean;
  pix_chave: string | null;
  pix_nome_titular: string | null;
}

/** Carrega pedido + itens + dados PIX do restaurante (público, para tela de status). */
export const carregarStatusPedidoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pedidoId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: p, error: pErr } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, total, observacao, criado_em, restaurante_id")
      .eq("id", data.pedidoId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!p) return { pedido: null, itens: [] as PedidoItem[], restaurante: null };

    const [{ data: its, error: iErr }, { data: r, error: rErr }] = await Promise.all([
      supabaseAdmin
        .from("pedido_itens")
        .select("id, pedido_id, nome_produto, quantidade, preco_unit, observacao, cliente_nome, status, quantidade_pronta")
        .eq("pedido_id", data.pedidoId),
      supabaseAdmin
        .from("restaurantes")
        .select("nome, pix_habilitado, pix_chave, pix_nome_titular")
        .eq("id", p.restaurante_id)
        .maybeSingle(),
    ]);
    if (iErr) throw new Error(iErr.message);
    if (rErr) throw new Error(rErr.message);

    return {
      pedido: p as Pedido,
      itens: (its ?? []) as PedidoItem[],
      restaurante: (r ?? null) as RestaurantePix | null,
    };
  });

/* ---------- Garçom: criar pedido verbal na mesa ---------- */

const itemGarcomSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().int().min(1).max(99),
  observacao: z.string().max(300).optional(),
});

export type CriarPedidoGarcomResultado =
  | {
      ok: true;
      pedido_id: string;
      sessao_id: string;
      comanda_id: string;
    }
  | {
      ok: false;
      erro: "multiplas_comandas_abertas";
    };

/** Cria pedido lançado pelo garçom (cliente pediu verbalmente). */
export const criarPedidoGarcomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        mesaId: z.string().uuid(),
        garcomId: z.string().uuid().nullable().optional(),
        clienteId: z.string().uuid().nullable().optional(),
        comandaId: z.string().uuid().nullable().optional(),
        observacao: z.string().max(300).optional(),
        itens: z.array(itemGarcomSchema).min(1).max(60),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<CriarPedidoGarcomResultado> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    // Carrega produtos e calcula total no servidor (anti-tampering)
    const ids = Array.from(new Set(data.itens.map((i) => i.produto_id)));
    const { data: prods, error: pErr } = await supabaseAdmin
      .from("produtos")
      .select("id, preco, disponivel, restaurante_id, nome")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);

    const precoMap = new Map<
      string,
      { preco: number; disponivel: boolean; nome: string }
    >();
    for (const p of prods ?? []) {
      if (p.restaurante_id !== data.restauranteId) {
        throw new Error("Produto não pertence a este restaurante");
      }
      precoMap.set(p.id, {
        preco: Number(p.preco),
        disponivel: p.disponivel,
        nome: p.nome,
      });
    }

    let total = 0;
    const itensPayload = data.itens.map((it) => {
      const real = precoMap.get(it.produto_id);
      if (!real) throw new Error("Produto indisponível");
      if (!real.disponivel) throw new Error(`Produto ${real.nome} indisponível`);
      total += real.preco * it.quantidade;
      return {
        produto_id: it.produto_id,
        nome_produto: real.nome,
        quantidade: it.quantidade,
        preco_unit: real.preco,
        observacao: it.observacao ?? "",
        cliente_nome: "",
        cliente_id: data.clienteId ?? "",
      };
    });

    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "criar_pedido_garcom",
      {
        _restaurante_id: data.restauranteId,
        _mesa_id: data.mesaId,
        _garcom_id: (data.garcomId ?? null) as unknown as string,
        _cliente_id: (data.clienteId ?? null) as unknown as string,
        _comanda_id: (data.comandaId ?? null) as unknown as string,
        _observacao: data.observacao ?? "",
        _total: total,
        _itens: itensPayload,
      },
    );
    if (rpcErr) {
      if (rpcErr.message.includes("multiplas_comandas_abertas")) {
        return { ok: false, erro: "multiplas_comandas_abertas" };
      }
      throw new Error(rpcErr.message);
    }
    const res = rpcData as {
      pedido_id: string;
      sessao_id: string;
      comanda_id: string;
    };
    return {
      ok: true,
      pedido_id: res.pedido_id,
      sessao_id: res.sessao_id,
      comanda_id: res.comanda_id,
    };
  });

/* ---------- Garçom: lookup de cliente por telefone (sem QR) ---------- */

export interface ClienteLookupResultado {
  encontrado: boolean;
  cliente?: { id: string; nome: string; telefone: string };
}

export const buscarClienteRestaurantePorTelefoneFn = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        telefone: z
          .string()
          .transform((s) => s.replace(/\D/g, ""))
          .pipe(z.string().min(10).max(15)),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ClienteLookupResultado> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: cli, error } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, telefone")
      .eq("restaurante_id", data.restauranteId)
      .eq("telefone", data.telefone)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cli) return { encontrado: false };
    return {
      encontrado: true,
      cliente: {
        id: cli.id as string,
        nome: cli.nome as string,
        telefone: cli.telefone as string,
      },
    };
  });

/* ---------- Garçom: comandas abertas da mesa (para seletor) ---------- */

export interface ComandaAbertaInfo {
  id: string;
  tipo: "individual" | "compartilhada";
  titular_nome: string | null;
}

export const listarComandasAbertasMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        mesaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ComandaAbertaInfo[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: sessao } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id")
      .eq("mesa_id", data.mesaId)
      .eq("status", "aberta")
      .maybeSingle();
    if (!sessao) return [];

    const { data: comandas, error } = await supabaseAdmin
      .from("comandas")
      .select("id, tipo, titular_cliente_id")
      .eq("sessao_id", sessao.id)
      .eq("status", "aberta")
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);
    const lista = (comandas ?? []) as Array<{
      id: string;
      tipo: "individual" | "compartilhada";
      titular_cliente_id: string | null;
    }>;
    if (lista.length === 0) return [];

    const titularIds = lista
      .map((c) => c.titular_cliente_id)
      .filter((v): v is string => !!v);
    const nomes = new Map<string, string>();
    if (titularIds.length) {
      const { data: cs } = await supabaseAdmin
        .from("clientes")
        .select("id, nome")
        .in("id", titularIds);
      for (const c of cs ?? []) nomes.set(c.id as string, c.nome as string);
    }
    return lista.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      titular_nome: c.titular_cliente_id ? nomes.get(c.titular_cliente_id) ?? null : null,
    }));
  });

/* ---------- Garçom/Admin: resumo consolidado da conta da mesa ---------- */

export interface ResumoMesaItem {
  id: string;
  nome_produto: string;
  quantidade: number;
  quantidade_pronta: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
  destino: "cozinha" | "bar";
  status: "pendente" | "em_preparo" | "pronto";
}

export interface ResumoMesaPedido {
  id: string;
  status: StatusPedido;
  total: number;
  criado_em: string;
  comanda_id: string | null;
  garcom_nome: string | null;
  cliente_nome: string | null;
  observacao: string | null;
  itens: ResumoMesaItem[];
  destino_status: { destino: "cozinha" | "bar"; status: StatusPedido }[];
}

export interface ResumoMesaComanda {
  id: string;
  tipo: "individual" | "compartilhada";
  titular_nome: string | null;
  titular_cliente_id: string | null;
  participantes: { cliente_id: string; nome: string }[];
  subtotal: number;
  desconto_cupom: number;
  cashback_resgatado: number;
  total: number;
  total_pago: number;
  saldo: number;
  couverts: {
    id: string;
    tipo: "mesa" | "artistico";
    quantidade: number;
    valor_unitario: number;
    total: number;
    descricao: string | null;
  }[];
}

export interface ResumoContaMesa {
  mesa: { id: string; numero: string };
  sessao: { id: string; aberta_em: string } | null;
  comandas: ResumoMesaComanda[];
  pedidos: ResumoMesaPedido[];
  totais: {
    subtotal: number;
    desconto_cupom: number;
    cashback_resgatado: number;
    total: number;
    total_pago: number;
    saldo: number;
  };
}

export const resumoContaMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        mesaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ResumoContaMesa> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, numero, restaurante_id")
      .eq("id", data.mesaId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa || mesa.restaurante_id !== data.restauranteId) {
      throw new Error("Mesa não encontrada");
    }

    const { data: sessao } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, aberta_em")
      .eq("mesa_id", data.mesaId)
      .eq("status", "aberta")
      .maybeSingle();

    const sessaoInfo = sessao
      ? { id: sessao.id as string, aberta_em: sessao.aberta_em as string }
      : null;

    let comandas: ResumoMesaComanda[] = [];
    let pedidos: ResumoMesaPedido[] = [];

    if (sessaoInfo) {
      // Limpa comandas órfãs antes de montar o resumo.
      await sanitizarComandasOrfas(sessaoInfo.id);

      const { data: cs, error: cErr } = await supabaseAdmin
        .from("comandas")
        .select(
          "id, tipo, subtotal, desconto_cupom, cashback_resgatado, total, total_pago, titular_cliente_id",
        )
        .eq("sessao_id", sessaoInfo.id)
        .eq("status", "aberta")
        .order("criado_em", { ascending: true });
      if (cErr) throw new Error(cErr.message);
      const lista = (cs ?? []) as Array<{
        id: string;
        tipo: "individual" | "compartilhada";
        subtotal: number;
        desconto_cupom: number;
        cashback_resgatado: number;
        total: number;
        total_pago: number;
        titular_cliente_id: string | null;
      }>;

      const titularIds = lista
        .map((c) => c.titular_cliente_id)
        .filter((v): v is string => !!v);
      const nomesTitulares = new Map<string, string>();
      if (titularIds.length) {
        const { data: cli } = await supabaseAdmin
          .from("clientes")
          .select("id, nome")
          .in("id", titularIds);
        for (const c of cli ?? []) {
          nomesTitulares.set(c.id as string, c.nome as string);
        }
      }

      // Participantes ativos por comanda
      const comandaIds = lista.map((c) => c.id);
      const participantesPorComanda = new Map<
        string,
        { cliente_id: string; nome: string }[]
      >();
      if (comandaIds.length > 0) {
        const { data: vincs } = await supabaseAdmin
          .from("mesa_sessao_clientes")
          .select("comanda_id, cliente_id, clientes:cliente_id(nome)")
          .in("comanda_id", comandaIds)
          .is("saiu_em", null);
        for (const v of (vincs ?? []) as Array<{
          comanda_id: string | null;
          cliente_id: string | null;
          clientes: { nome: string } | null;
        }>) {
          const cid = v.comanda_id;
          const clid = v.cliente_id;
          if (!cid || !clid) continue;
          if (!participantesPorComanda.has(cid)) participantesPorComanda.set(cid, []);
          participantesPorComanda.get(cid)!.push({
            cliente_id: clid,
            nome: v.clientes?.nome ?? "",
          });
        }
      }

      // Couverts por comanda
      const couvertsPorComanda = new Map<
        string,
        ResumoMesaComanda["couverts"]
      >();
      if (comandaIds.length > 0) {
        const { data: covs } = await supabaseAdmin
          .from("comanda_couverts")
          .select("id, comanda_id, tipo, quantidade, valor_unitario, descricao")
          .in("comanda_id", comandaIds)
          .order("criado_em", { ascending: true });
        for (const cv of (covs ?? []) as Array<{
          id: string;
          comanda_id: string;
          tipo: "mesa" | "artistico";
          quantidade: number;
          valor_unitario: number;
          descricao: string | null;
        }>) {
          const q = Number(cv.quantidade);
          const v = Number(cv.valor_unitario);
          const arr = couvertsPorComanda.get(cv.comanda_id) ?? [];
          arr.push({
            id: cv.id,
            tipo: cv.tipo,
            quantidade: q,
            valor_unitario: v,
            total: q * v,
            descricao: cv.descricao ?? null,
          });
          couvertsPorComanda.set(cv.comanda_id, arr);
        }
      }

      comandas = lista.map((c) => {
        const total = Number(c.total ?? 0);
        const pago = Number(c.total_pago ?? 0);
        return {
          id: c.id,
          tipo: c.tipo,
          titular_nome: c.titular_cliente_id
            ? nomesTitulares.get(c.titular_cliente_id) ?? null
            : null,
          titular_cliente_id: c.titular_cliente_id,
          participantes: participantesPorComanda.get(c.id) ?? [],
          subtotal: Number(c.subtotal ?? 0),
          desconto_cupom: Number(c.desconto_cupom ?? 0),
          cashback_resgatado: Number(c.cashback_resgatado ?? 0),
          total,
          total_pago: pago,
          saldo: total - pago,
          couverts: couvertsPorComanda.get(c.id) ?? [],
        };
      });

      // Pedidos da sessão (cronológico)
      const { data: peds, error: pErr } = await supabaseAdmin
        .from("pedidos")
        .select(
          "id, status, total, criado_em, comanda_id, garcom_id, cliente_id, cliente_nome, observacao",
        )
        .eq("sessao_id", sessaoInfo.id)
        .neq("status", "cancelado")
        .order("criado_em", { ascending: true });
      if (pErr) throw new Error(pErr.message);
      const listaPed = (peds ?? []) as Array<{
        id: string;
        status: StatusPedido;
        total: number;
        criado_em: string;
        comanda_id: string | null;
        garcom_id: string | null;
        cliente_id: string | null;
        cliente_nome: string | null;
        observacao: string | null;
      }>;

      const pedidoIds = listaPed.map((p) => p.id);
      let itensRaw: Array<{
        id: string;
        pedido_id: string;
        nome_produto: string;
        quantidade: number;
        quantidade_pronta: number;
        preco_unit: number;
        observacao: string | null;
        cliente_nome: string | null;
        destino: "cozinha" | "bar";
        status: "pendente" | "em_preparo" | "pronto";
      }> = [];
      let destinoStatusRaw: Array<{
        pedido_id: string;
        destino: "cozinha" | "bar";
        status: StatusPedido;
      }> = [];
      if (pedidoIds.length) {
        const [{ data: its, error: iErr }, { data: ds, error: dErr }] = await Promise.all([
          supabaseAdmin
            .from("pedido_itens")
            .select(
              "id, pedido_id, nome_produto, quantidade, quantidade_pronta, preco_unit, observacao, cliente_nome, destino, status",
            )
            .in("pedido_id", pedidoIds),
          supabaseAdmin
            .from("pedido_destino_status")
            .select("pedido_id, destino, status")
            .in("pedido_id", pedidoIds),
        ]);
        if (iErr) throw new Error(iErr.message);
        if (dErr) throw new Error(dErr.message);
        itensRaw = (its ?? []) as typeof itensRaw;
        destinoStatusRaw = (ds ?? []) as typeof destinoStatusRaw;
      }

      // Nomes de garçons
      const garcomIds = Array.from(
        new Set(listaPed.map((p) => p.garcom_id).filter((v): v is string => !!v)),
      );
      const nomesGarcom = new Map<string, string>();
      if (garcomIds.length) {
        const { data: gs } = await supabaseAdmin
          .from("garcons")
          .select("id, nome")
          .in("id", garcomIds);
        for (const g of gs ?? []) {
          nomesGarcom.set(g.id as string, g.nome as string);
        }
      }

      // Nomes de clientes (autor do pedido) quando vazio em cliente_nome
      const clienteIds = Array.from(
        new Set(listaPed.map((p) => p.cliente_id).filter((v): v is string => !!v)),
      );
      const nomesClientes = new Map<string, string>();
      if (clienteIds.length) {
        const { data: cli2 } = await supabaseAdmin
          .from("clientes")
          .select("id, nome")
          .in("id", clienteIds);
        for (const c of cli2 ?? []) {
          nomesClientes.set(c.id as string, c.nome as string);
        }
      }

      const itensPorPedido = new Map<string, ResumoMesaItem[]>();
      for (const it of itensRaw) {
        const arr = itensPorPedido.get(it.pedido_id) ?? [];
        arr.push({
          id: it.id,
          nome_produto: it.nome_produto,
          quantidade: it.quantidade,
          quantidade_pronta: it.quantidade_pronta ?? 0,
          preco_unit: Number(it.preco_unit),
          observacao: it.observacao,
          cliente_nome: it.cliente_nome,
          destino: it.destino,
          status: it.status,
        });
        itensPorPedido.set(it.pedido_id, arr);
      }

      const dsPorPedido = new Map<
        string,
        { destino: "cozinha" | "bar"; status: StatusPedido }[]
      >();
      for (const d of destinoStatusRaw) {
        const arr = dsPorPedido.get(d.pedido_id) ?? [];
        arr.push({ destino: d.destino, status: d.status });
        dsPorPedido.set(d.pedido_id, arr);
      }

      pedidos = listaPed.map((p) => ({
        id: p.id,
        status: p.status,
        total: Number(p.total ?? 0),
        criado_em: p.criado_em,
        comanda_id: p.comanda_id,
        garcom_nome: p.garcom_id ? nomesGarcom.get(p.garcom_id) ?? null : null,
        cliente_nome:
          p.cliente_nome ||
          (p.cliente_id ? nomesClientes.get(p.cliente_id) ?? null : null),
        observacao: p.observacao,
        itens: itensPorPedido.get(p.id) ?? [],
        destino_status: dsPorPedido.get(p.id) ?? [],
      }));
    }

    const totais = comandas.reduce(
      (acc, c) => ({
        subtotal: acc.subtotal + c.subtotal,
        desconto_cupom: acc.desconto_cupom + c.desconto_cupom,
        cashback_resgatado: acc.cashback_resgatado + c.cashback_resgatado,
        total: acc.total + c.total,
        total_pago: acc.total_pago + c.total_pago,
        saldo: acc.saldo + c.saldo,
      }),
      {
        subtotal: 0,
        desconto_cupom: 0,
        cashback_resgatado: 0,
        total: 0,
        total_pago: 0,
        saldo: 0,
      },
    );

    return {
      mesa: { id: mesa.id as string, numero: mesa.numero as string },
      sessao: sessaoInfo,
      comandas,
      pedidos,
      totais,
    };
  });

/* ============================================================
 * Resumo de comanda específico para impressão (caixa)
 * ============================================================
 * Retorna restaurante (com dados cadastrais), mesa, itens da comanda,
 * couverts, totais e pagamentos confirmados — tudo em uma chamada.
 */
export interface ResumoComandaImpressao {
  restaurante: {
    nome: string;
    cnpj: string | null;
    endereco: string | null;
    telefone: string | null;
    logo_url: string | null;
  };
  mesa_numero: string | null;
  comanda: {
    id: string;
    titular_nome: string | null;
  };
  garcom_nome: string | null;
  itens: Array<{
    nome: string;
    quantidade: number;
    preco_unit: number;
    observacao: string | null;
  }>;
  couverts: Array<{ descricao: string; total: number }>;
  totais: {
    subtotal: number;
    couvert: number;
    desconto: number;
    total: number;
    total_pago: number;
    saldo: number;
  };
  pagamentos: Array<{ metodo: string; valor: number; quando: string }>;
}

export const resumoComandaImpressaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        comandaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ResumoComandaImpressao> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const [{ data: rest }, { data: com, error: cErr }] = await Promise.all([
      supabaseAdmin
        .from("restaurantes")
        .select("nome, cnpj, endereco, telefone, logo_url")
        .eq("id", data.restauranteId)
        .maybeSingle(),
      supabaseAdmin
        .from("comandas")
        .select(
          "id, sessao_id, titular_cliente_id, subtotal, desconto_cupom, cashback_resgatado, total, total_pago",
        )
        .eq("id", data.comandaId)
        .maybeSingle(),
    ]);
    if (cErr) throw new Error(cErr.message);
    if (!rest) throw new Error("Restaurante não encontrado");
    if (!com) throw new Error("Comanda não encontrada");

    const restauranteInfo = rest as {
      nome: string;
      cnpj: string | null;
      endereco: string | null;
      telefone: string | null;
      logo_url: string | null;
    };

    let mesaNumero: string | null = null;
    if (com.sessao_id) {
      const { data: sess } = await supabaseAdmin
        .from("mesa_sessoes")
        .select("mesa_id")
        .eq("id", com.sessao_id as string)
        .maybeSingle();
      const mesaId = (sess?.mesa_id as string | undefined) ?? null;
      if (mesaId) {
        const { data: mesa } = await supabaseAdmin
          .from("mesas")
          .select("numero")
          .eq("id", mesaId)
          .maybeSingle();
        mesaNumero = (mesa?.numero as string | undefined) ?? null;
      }
    }

    let titularNome: string | null = null;
    if (com.titular_cliente_id) {
      const { data: cli } = await supabaseAdmin
        .from("clientes")
        .select("nome")
        .eq("id", com.titular_cliente_id as string)
        .maybeSingle();
      titularNome = (cli?.nome as string | undefined) ?? null;
    }

    // Pedidos não cancelados da comanda
    const { data: peds, error: pErr } = await supabaseAdmin
      .from("pedidos")
      .select("id, garcom_id")
      .eq("comanda_id", com.id as string)
      .neq("status", "cancelado")
      .order("criado_em", { ascending: true });
    if (pErr) throw new Error(pErr.message);
    const pedidoIds = (peds ?? []).map((p) => p.id as string);

    let itens: ResumoComandaImpressao["itens"] = [];
    if (pedidoIds.length) {
      const { data: its, error: iErr } = await supabaseAdmin
        .from("pedido_itens")
        .select("nome_produto, quantidade, preco_unit, observacao")
        .in("pedido_id", pedidoIds);
      if (iErr) throw new Error(iErr.message);
      itens = (its ?? []).map((it) => ({
        nome: it.nome_produto as string,
        quantidade: Number(it.quantidade),
        preco_unit: Number(it.preco_unit),
        observacao: (it.observacao as string | null) ?? null,
      }));
    }

    let garcomNome: string | null = null;
    const primGarcomId = (peds ?? [])
      .map((p) => p.garcom_id as string | null)
      .find((g): g is string => !!g);
    if (primGarcomId) {
      const { data: g } = await supabaseAdmin
        .from("garcons")
        .select("nome")
        .eq("id", primGarcomId)
        .maybeSingle();
      garcomNome = (g?.nome as string | undefined) ?? null;
    }

    // Couverts
    const { data: covs } = await supabaseAdmin
      .from("comanda_couverts")
      .select("tipo, quantidade, valor_unitario, descricao")
      .eq("comanda_id", com.id as string)
      .order("criado_em", { ascending: true });
    let couvertTotal = 0;
    const couverts = (covs ?? []).map((cv) => {
      const q = Number(cv.quantidade);
      const v = Number(cv.valor_unitario);
      const total = q * v;
      couvertTotal += total;
      const label =
        (cv.descricao as string | null) ??
        (cv.tipo === "mesa" ? "Couvert mesa" : "Couvert artístico");
      return { descricao: `${label} (${q}× ${v.toFixed(2)})`, total };
    });

    // Pagamentos confirmados
    const { data: pags } = await supabaseAdmin
      .from("pagamentos")
      .select("metodo, valor, status, criado_em, confirmado_em")
      .eq("comanda_id", com.id as string)
      .eq("status", "confirmado")
      .order("criado_em", { ascending: true });
    const pagamentos = (pags ?? []).map((p) => ({
      metodo: p.metodo as string,
      valor: Number(p.valor),
      quando: ((p.confirmado_em as string | null) ?? (p.criado_em as string)),
    }));

    const subtotal = Number(com.subtotal ?? 0);
    const desconto =
      Number(com.desconto_cupom ?? 0) + Number(com.cashback_resgatado ?? 0);
    const total = Number(com.total ?? 0);
    const total_pago = Number(com.total_pago ?? 0);

    return {
      restaurante: restauranteInfo,
      mesa_numero: mesaNumero,
      comanda: { id: com.id as string, titular_nome: titularNome },
      garcom_nome: garcomNome,
      itens,
      couverts,
      totais: {
        subtotal,
        couvert: couvertTotal,
        desconto,
        total,
        total_pago,
        saldo: Math.max(0, total - total_pago),
      },
      pagamentos,
    };
  });

/* ---------- Admin: histórico, auditoria e cancelados ---------- */

const canalEnum = z.enum(["todos", "mesa", "delivery", "retirada"]);
const statusFiltroHistorico = z.enum(["todos", "entregue", "cancelado", "abertos"]);

export interface PedidoListaItem {
  id: string;
  status: StatusPedido;
  total: number;
  criado_em: string;
  mesa_id: string;
  restaurante_id: string;
  comanda_id: string | null;
  garcom_id: string | null;
  canal?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  observacao?: string | null;
  taxa_entrega?: number | null;
  endereco_cep?: string | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_referencia?: string | null;
}

const COLUNAS_PEDIDO =
  "id, status, total, observacao, criado_em, mesa_id, restaurante_id, comanda_id, garcom_id, canal, cliente_nome, cliente_telefone, taxa_entrega, endereco_cep, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, endereco_referencia";

function inicioHoje(): Date {
  return inicioDoDia();
}

async function carregarMesas(supabase: any, restauranteId: string): Promise<MesaResumo[]> {
  const { data, error } = await supabase
    .from("mesas")
    .select("id, numero")
    .eq("restaurante_id", restauranteId);
  if (error) throw new Error(error.message);
  return (data ?? []) as MesaResumo[];
}

export const listarPedidosHistoricoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        dataInicio: z.string().min(10),
        dataFim: z.string().min(10),
        canal: canalEnum.default("todos"),
        status: statusFiltroHistorico.default("todos"),
        busca: z.string().max(80).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const ini = inicioDoDia(data.dataInicio);
    const fim = fimDoDia(data.dataFim);
    // Limita rigidamente: histórico = anterior a hoje
    const limiteHoje = inicioHoje();
    if (fim >= limiteHoje) fim.setTime(limiteHoje.getTime() - 1);

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabase
      .from("pedidos")
      .select(COLUNAS_PEDIDO, { count: "exact" })
      .eq("restaurante_id", data.restauranteId)
      .gte("criado_em", ini.toISOString())
      .lte("criado_em", fim.toISOString())
      .order("criado_em", { ascending: false })
      .range(from, to);

    if (data.canal !== "todos") q = q.eq("canal", data.canal);
    if (data.status === "entregue") q = q.eq("status", "entregue");
    else if (data.status === "cancelado") q = q.eq("status", "cancelado");
    else if (data.status === "abertos")
      q = q.in("status", ["recebido", "em_preparo", "pronto"]);

    if (data.busca && data.busca.trim()) {
      const termo = `%${data.busca.trim()}%`;
      q = q.or(`cliente_nome.ilike.${termo},cliente_telefone.ilike.${termo}`);
    }

    const { data: peds, error, count } = await q;
    if (error) throw new Error(error.message);

    const pedidos = (peds ?? []) as PedidoListaItem[];
    const mesas = await carregarMesas(supabase, data.restauranteId);

    // contagem de itens por pedido
    const ids = pedidos.map((p) => p.id);
    const itensPorPedido = new Map<string, number>();
    if (ids.length) {
      const { data: its } = await supabase
        .from("pedido_itens")
        .select("pedido_id, quantidade")
        .in("pedido_id", ids);
      for (const it of (its ?? []) as Array<{ pedido_id: string; quantidade: number }>) {
        itensPorPedido.set(it.pedido_id, (itensPorPedido.get(it.pedido_id) ?? 0) + Number(it.quantidade));
      }
    }
    const itensCount = Object.fromEntries(itensPorPedido) as Record<string, number>;

    return { pedidos, mesas, itensCount, total: count ?? 0 };
  });

export const listarPedidosAbertosAntigosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const limite = inicioHoje().toISOString();
    const { data: peds, error } = await supabase
      .from("pedidos")
      .select(COLUNAS_PEDIDO)
      .eq("restaurante_id", data.restauranteId)
      .lt("criado_em", limite)
      .in("status", ["recebido", "em_preparo", "pronto"])
      .order("criado_em", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);

    const pedidos = (peds ?? []) as PedidoListaItem[];
    const mesas = await carregarMesas(supabase, data.restauranteId);
    return { pedidos, mesas };
  });

export interface PedidoCanceladoInfo {
  pedido_id: string;
  motivo: string | null;
  cancelado_em: string | null;
  actor_email: string | null;
}

export const listarPedidosCanceladosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        dataInicio: z.string().min(10),
        dataFim: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const ini = inicioDoDia(data.dataInicio);
    const fim = fimDoDia(data.dataFim);

    const { data: peds, error } = await supabase
      .from("pedidos")
      .select(COLUNAS_PEDIDO)
      .eq("restaurante_id", data.restauranteId)
      .eq("status", "cancelado")
      .gte("criado_em", ini.toISOString())
      .lte("criado_em", fim.toISOString())
      .order("criado_em", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const pedidos = (peds ?? []) as PedidoListaItem[];
    const mesas = await carregarMesas(supabase, data.restauranteId);

    const ids = pedidos.map((p) => p.id);
    let cancelInfo: PedidoCanceladoInfo[] = [];
    if (ids.length) {
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("entidade_id, criado_em, metadata, actor_user_id")
        .eq("entidade", "pedido")
        .eq("acao", "cancelar")
        .in("entidade_id", ids)
        .order("criado_em", { ascending: false });

      const byId = new Map<string, { motivo: string | null; cancelado_em: string; actor_user_id: string | null }>();
      for (const l of (logs ?? []) as Array<{
        entidade_id: string;
        criado_em: string;
        metadata: any;
        actor_user_id: string | null;
      }>) {
        if (byId.has(l.entidade_id)) continue;
        byId.set(l.entidade_id, {
          motivo: (l.metadata?.motivo as string | null) ?? null,
          cancelado_em: l.criado_em,
          actor_user_id: l.actor_user_id,
        });
      }

      // resolve emails dos autores via admin
      const actorIds = Array.from(
        new Set(
          Array.from(byId.values())
            .map((v) => v.actor_user_id)
            .filter((v): v is string => !!v),
        ),
      );
      const emailMap = new Map<string, string>();
      if (actorIds.length) {
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        for (const uid of actorIds) {
          try {
            const { data: u } = await admin.auth.admin.getUserById(uid);
            if (u?.user?.email) emailMap.set(uid, u.user.email);
          } catch {
            /* ignore */
          }
        }
      }

      cancelInfo = ids.map((id) => {
        const info = byId.get(id);
        return {
          pedido_id: id,
          motivo: info?.motivo ?? null,
          cancelado_em: info?.cancelado_em ?? null,
          actor_email: info?.actor_user_id ? emailMap.get(info.actor_user_id) ?? null : null,
        };
      });
    }

    return { pedidos, mesas, cancelInfo };
  });

export const cancelarPedidosEmLoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        pedidoIds: z.array(z.string().uuid()).min(1).max(50),
        motivo: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    let ok = 0;
    const erros: { pedidoId: string; mensagem: string }[] = [];
    for (const id of data.pedidoIds) {
      const { error } = await supabase.rpc("cancelar_pedido", {
        _pedido_id: id,
        _motivo: data.motivo ?? undefined,
      });
      if (error) erros.push({ pedidoId: id, mensagem: error.message });
      else ok++;
    }
    return { ok, erros };
  });

export const marcarPedidosEntreguesEmLoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        pedidoIds: z.array(z.string().uuid()).min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const agora = new Date().toISOString();
    let ok = 0;
    const erros: { pedidoId: string; mensagem: string }[] = [];
    for (const id of data.pedidoIds) {
      const { error } = await supabase
        .from("pedidos")
        .update({ status: "entregue", atualizado_em: agora, entregue_em: agora })
        .eq("id", id)
        .eq("restaurante_id", data.restauranteId)
        .in("status", ["recebido", "em_preparo", "pronto"]);
      if (error) erros.push({ pedidoId: id, mensagem: error.message });
      else {
        ok++;
        const { error: cbErr } = await supabaseAdmin.rpc("creditar_cashback_pedido", {
          _pedido_id: id,
        });
        if (cbErr) {
          erros.push({
            pedidoId: id,
            mensagem: `Entregue, mas o cashback não foi creditado: ${cbErr.message}`,
          });
        }
      }
    }
    return { ok, erros };
  });
