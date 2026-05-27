import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export interface PedidoGarcomItem {
  garcom_id: string;
  garcom_nome: string;
  peso: number;
}

export const listarPedidoGarconsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        pedidoId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<PedidoGarcomItem[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("pedido_garcons")
      .select("garcom_id, peso")
      .eq("pedido_id", data.pedidoId)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.garcom_id as string)));
    const nomes = new Map<string, string>();
    if (ids.length) {
      const { data: gs } = await supabase
        .from("garcons")
        .select("id, nome")
        .in("id", ids);
      for (const g of gs ?? []) nomes.set(g.id as string, g.nome as string);
    }
    return (rows ?? []).map((r) => ({
      garcom_id: r.garcom_id as string,
      garcom_nome: nomes.get(r.garcom_id as string) ?? "—",
      peso: Number(r.peso),
    }));
  });

export const definirGarconsPedidoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        pedidoId: z.string().uuid(),
        itens: z
          .array(
            z.object({
              garcom_id: z.string().uuid(),
              peso: z.number().min(0.01).max(100),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const soma = data.itens.reduce((s, i) => s + i.peso, 0);
    if (Math.round(soma * 100) / 100 !== 100) {
      throw new Error(`Soma dos pesos deve ser 100 (recebido: ${soma})`);
    }
    const { error } = await supabase.rpc("definir_garcons_pedido", {
      _pedido_id: data.pedidoId,
      _items: data.itens,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });