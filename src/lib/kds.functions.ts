import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export type ItemStatus = "pendente" | "em_preparo" | "pronto";

function derivarStatusItem(quantidadePronta: number, quantidade: number): ItemStatus {
  if (quantidadePronta <= 0) return "pendente";
  if (quantidadePronta >= quantidade) return "pronto";
  return "em_preparo";
}

export const marcarItemUnidadesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      itemId: z.string().uuid(),
      quantidadePronta: z.number().int().min(0).max(999),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: item, error: itemErr } = await supabase
      .from("pedido_itens")
      .select("id, pedido_id, quantidade")
      .eq("id", data.itemId)
      .maybeSingle();
    if (itemErr) throw new Error(itemErr.message);
    if (!item) throw new Error("Item não encontrado");

    const { data: pedido, error: pErr } = await supabase
      .from("pedidos")
      .select("id, restaurante_id, status")
      .eq("id", item.pedido_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!pedido) throw new Error("Pedido não encontrado");

    await assertAcessoRestaurante(supabase, userId, pedido.restaurante_id);

    if (pedido.status === "entregue" || pedido.status === "cancelado") {
      throw new Error("Pedido finalizado não pode ser alterado");
    }

    const quantidade = item.quantidade as number;
    if (data.quantidadePronta > quantidade) {
      throw new Error("Quantidade pronta acima do total do item");
    }

    const novoStatus = derivarStatusItem(data.quantidadePronta, quantidade);

    const { error: uErr } = await supabase
      .from("pedido_itens")
      .update({
        quantidade_pronta: data.quantidadePronta,
        status: novoStatus,
      })
      .eq("id", data.itemId);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, status: novoStatus, quantidadePronta: data.quantidadePronta };
  });
