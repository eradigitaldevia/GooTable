import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

/** Lança um couvert (mesa ou artístico) numa comanda. Apenas membro. */
export const lancarCouvertFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      comandaId: z.string().uuid(),
      tipo: z.enum(["mesa", "artistico"]),
      quantidade: z.number().int().min(1).max(50),
      valorUnitario: z.number().min(0).max(1000).optional(),
      descricao: z.string().trim().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: rest } = await supabaseAdmin
      .from("restaurantes")
      .select(
        "couvert_mesa_habilitado, couvert_mesa_valor, couvert_mesa_descricao, couvert_artistico_habilitado, couvert_artistico_valor, couvert_artistico_descricao",
      )
      .eq("id", data.restauranteId)
      .maybeSingle();

    let valor: number;
    let descricao: string;
    if (data.tipo === "mesa") {
      if (!rest?.couvert_mesa_habilitado) throw new Error("Couvert de mesa não habilitado.");
      valor = data.valorUnitario ?? Number(rest.couvert_mesa_valor ?? 0);
      descricao = data.descricao ?? (rest.couvert_mesa_descricao as string | null) ?? "Couvert de mesa";
    } else {
      if (!rest?.couvert_artistico_habilitado) throw new Error("Couvert artístico não habilitado.");
      valor = data.valorUnitario ?? Number(rest.couvert_artistico_valor ?? 0);
      descricao = data.descricao ?? (rest.couvert_artistico_descricao as string | null) ?? "Couvert artístico";
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("Valor do couvert inválido.");
    }

    const { data: comanda } = await supabaseAdmin
      .from("comandas")
      .select("id, restaurante_id, status")
      .eq("id", data.comandaId)
      .maybeSingle();
    if (!comanda || comanda.restaurante_id !== data.restauranteId) {
      throw new Error("Comanda não encontrada.");
    }
    if (comanda.status !== "aberta") {
      throw new Error("Comanda não está aberta.");
    }

    const { error } = await supabaseAdmin.from("comanda_couverts").insert({
      comanda_id: data.comandaId,
      restaurante_id: data.restauranteId,
      tipo: data.tipo,
      quantidade: data.quantidade,
      valor_unitario: valor,
      descricao,
      lancado_por: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove um couvert (apenas membro). Trigger recalcula totais. */
export const removerCouvertFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      couvertId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabaseAdmin
      .from("comanda_couverts")
      .delete()
      .eq("id", data.couvertId)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
