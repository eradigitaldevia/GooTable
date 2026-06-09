import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface StatusPedidoPublico {
  id: string;
  status: "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";
  total: number;
  observacao: string | null;
  criado_em: string;
  restaurante_id: string;
}
export interface StatusItemPublico {
  id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
  status: "pendente" | "em_preparo" | "pronto";
  quantidade_pronta: number;
}
export interface StatusRestaurantePublico {
  nome: string;
  pix_habilitado: boolean;
  pix_chave: string | null;
  pix_nome_titular: string | null;
}

export type StatusPedidoResultado =
  | { erro: string; pedido?: never; itens?: never; restaurante?: never }
  | {
      erro?: never;
      pedido: StatusPedidoPublico;
      itens: StatusItemPublico[];
      restaurante: StatusRestaurantePublico;
    };

export interface PedidoComandaResumo {
  id: string;
  status: "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";
  total: number;
  criado_em: string;
  itens_total: number;
  itens_prontos: number;
}

/**
 * Carrega status de pedido para a tela pública do cliente, validando
 * que o pedidoId pertence ao restaurante da mesa identificada pelo qrToken.
 */
export const carregarStatusPedidoPublicoFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        pedidoId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<StatusPedidoResultado> => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("restaurante_id, ativa")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) return { erro: mErr.message };
    if (!mesa) return { erro: "Mesa não encontrada." };

    const { data: pedido, error: pErr } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, total, observacao, criado_em, restaurante_id")
      .eq("id", data.pedidoId)
      .eq("restaurante_id", mesa.restaurante_id)
      .maybeSingle();
    if (pErr) return { erro: pErr.message };
    if (!pedido) return { erro: "Pedido não encontrado." };

    const [{ data: itens }, { data: rest }] = await Promise.all([
      supabaseAdmin
        .from("pedido_itens")
        .select(
          "id, nome_produto, quantidade, preco_unit, observacao, cliente_nome, status, quantidade_pronta",
        )
        .eq("pedido_id", data.pedidoId),
      supabaseAdmin
        .from("restaurantes")
        .select("nome, pix_habilitado, pix_chave, pix_nome_titular")
        .eq("id", pedido.restaurante_id)
        .maybeSingle(),
    ]);

    if (!rest) return { erro: "Restaurante não encontrado." };

    return {
      pedido: {
        ...pedido,
        total: Number(pedido.total),
      } as StatusPedidoPublico,
      itens: (itens ?? []) as StatusItemPublico[],
      restaurante: rest as StatusRestaurantePublico,
    };
  });

/**
 * Lista todos os pedidos de uma comanda (timeline da refeição).
 * Valida que a comanda pertence ao restaurante da mesa identificada por qrToken.
 */
export const listarPedidosComandaPublicoFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        comandaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ erro?: string; pedidos?: PedidoComandaResumo[]; produto_ids?: string[] }> => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("restaurante_id")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) return { erro: mErr.message };
    if (!mesa) return { erro: "Mesa não encontrada." };

    const { data: comanda } = await supabaseAdmin
      .from("comandas")
      .select("id, restaurante_id")
      .eq("id", data.comandaId)
      .eq("restaurante_id", mesa.restaurante_id)
      .maybeSingle();
    if (!comanda) return { erro: "Comanda não encontrada." };

    const { data: pedidos, error: pErr } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, total, criado_em")
      .eq("comanda_id", data.comandaId)
      .order("criado_em", { ascending: true });
    if (pErr) return { erro: pErr.message };
    if (!pedidos || pedidos.length === 0) return { pedidos: [] };

    const ids = pedidos.map((p) => p.id);
    const { data: itens } = await supabaseAdmin
      .from("pedido_itens")
      .select("pedido_id, produto_id, quantidade, quantidade_pronta, status")
      .in("pedido_id", ids);

    const agg = new Map<string, { total: number; prontos: number }>();
    const produtoIds = new Set<string>();
    for (const it of itens ?? []) {
      const a = agg.get(it.pedido_id) ?? { total: 0, prontos: 0 };
      a.total += it.quantidade;
      a.prontos += it.status === "pronto" ? it.quantidade : it.quantidade_pronta;
      agg.set(it.pedido_id, a);
      if (it.status !== "cancelado" && it.produto_id) produtoIds.add(it.produto_id);
    }

    return {
      pedidos: pedidos.map((p) => {
        const a = agg.get(p.id) ?? { total: 0, prontos: 0 };
        return {
          id: p.id,
          status: p.status,
          total: Number(p.total),
          criado_em: p.criado_em,
          itens_total: a.total,
          itens_prontos: a.prontos,
        };
      }),
      produto_ids: Array.from(produtoIds),
    };
  });

/**
 * Cancela um item de pedido pelo cliente.
 * Regra: só permitido enquanto o item está com status='pendente'.
 * Não afeta a capacidade do garçom de cancelar pedidos.
 */
export const cancelarItemPedidoPublicoFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        pedidoId: z.string().uuid(),
        itemId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { erro: string }> => {
    const { data: mesa } = await supabaseAdmin
      .from("mesas")
      .select("restaurante_id")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (!mesa) return { erro: "Mesa não encontrada." };

    const { data: pedido } = await supabaseAdmin
      .from("pedidos")
      .select("id, restaurante_id, status")
      .eq("id", data.pedidoId)
      .eq("restaurante_id", mesa.restaurante_id)
      .maybeSingle();
    if (!pedido) return { erro: "Pedido não encontrado." };
    if (pedido.status === "cancelado" || pedido.status === "entregue") {
      return { erro: "Este pedido não pode mais ser alterado." };
    }

    const { data: item } = await supabaseAdmin
      .from("pedido_itens")
      .select("id, status, pedido_id")
      .eq("id", data.itemId)
      .eq("pedido_id", data.pedidoId)
      .maybeSingle();
    if (!item) return { erro: "Item não encontrado." };
    if (item.status !== "pendente") {
      return { erro: "Este item já entrou em preparo e não pode mais ser cancelado." };
    }

    const { error: delErr } = await supabaseAdmin
      .from("pedido_itens")
      .delete()
      .eq("id", data.itemId)
      .eq("status", "pendente"); // guard extra contra race
    if (delErr) return { erro: delErr.message };

    // Recalcula total do pedido a partir dos itens remanescentes.
    const { data: restantes } = await supabaseAdmin
      .from("pedido_itens")
      .select("quantidade, preco_unit")
      .eq("pedido_id", data.pedidoId);

    const novoTotal = (restantes ?? []).reduce(
      (s, it) => s + Number(it.preco_unit) * it.quantidade,
      0,
    );

    const todosCancelados = !restantes || restantes.length === 0;
    const { error: upErr } = await supabaseAdmin
      .from("pedidos")
      .update({
        total: novoTotal,
        atualizado_em: new Date().toISOString(),
        ...(todosCancelados ? { status: "cancelado" as const } : {}),
      })
      .eq("id", data.pedidoId);
    if (upErr) return { erro: upErr.message };

    return { ok: true };
  });