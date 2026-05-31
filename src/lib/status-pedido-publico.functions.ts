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