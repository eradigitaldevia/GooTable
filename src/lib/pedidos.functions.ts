import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

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

/* ---------- Admin: pedidos do dia + itens + mesas ---------- */

export const listarPedidosDoDiaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    const { data: peds, error: pErr } = await supabase
      .from("pedidos")
      .select("id, status, total, observacao, criado_em, mesa_id, restaurante_id, comanda_id, garcom_id")
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

    return {
      pedidos,
      itens,
      mesas: (ms ?? []) as MesaResumo[],
    };
  });

export const buscarItensPedidoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pedidoId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: its, error } = await supabase
      .from("pedido_itens")
      .select("id, pedido_id, nome_produto, quantidade, preco_unit, observacao, cliente_nome, status, quantidade_pronta")
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
    const { error } = await supabase
      .from("pedidos")
      .update({ status: data.status, atualizado_em: new Date().toISOString() })
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
}
export interface ResumoConta {
  comanda_atual: ResumoComanda | null;
  meu_subtotal_na_comanda: number;
  total_mesa: number;
  comandas_da_mesa: { id: string; tipo: "individual" | "compartilhada"; total: number }[];
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
      .select("id")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa) throw new Error("Mesa indisponível");

    // Comandas da sessão
    const { data: comandas, error: cErr } = await supabaseAdmin
      .from("comandas")
      .select("id, tipo, subtotal, cashback_resgatado, total, total_pago, desconto_cupom, cupom_id")
      .eq("sessao_id", data.sessaoId);
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
      };
    }

    const totalMesa = lista.reduce((acc, c) => acc + Number(c.total ?? 0), 0);

    return {
      comanda_atual: comandaAtual,
      meu_subtotal_na_comanda: meuSubtotal,
      total_mesa: totalMesa,
      comandas_da_mesa: lista.map((c) => ({
        id: c.id,
        tipo: c.tipo,
        total: Number(c.total ?? 0),
      })),
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
