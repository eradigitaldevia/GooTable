import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

export interface RepasseCouvert {
  id: string;
  restaurante_id: string;
  apresentacao_id: string;
  apresentacao_nome: string;
  artista_id: string;
  artista_nome: string;
  valor_couvert_total: number;
  percentual_repasse: number;
  peso: number;
  valor_repasse: number;
  status: "pendente" | "pago";
  calculado_em: string;
  pago_em: string | null;
}

export const listarRepassesCouvertFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      status: z.enum(["pendente", "pago", "todos"]).default("pendente"),
      artistaId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabaseAdmin
      .from("repasses_couvert_artistico")
      .select(
        "id, restaurante_id, apresentacao_id, artista_id, valor_couvert_total, percentual_repasse, peso, valor_repasse, status, calculado_em, pago_em, artistas:artista_id(nome), apresentacoes:apresentacao_id(nome)",
      )
      .eq("restaurante_id", data.restauranteId)
      .order("calculado_em", { ascending: false })
      .limit(500);
    if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.artistaId) q = q.eq("artista_id", data.artistaId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const artistaNome =
        (r as { artistas?: { nome: string } | null }).artistas?.nome ?? "—";
      const apNome =
        (r as { apresentacoes?: { nome: string } | null }).apresentacoes?.nome ?? "—";
      return {
        id: r.id,
        restaurante_id: r.restaurante_id,
        apresentacao_id: r.apresentacao_id,
        apresentacao_nome: apNome,
        artista_id: r.artista_id,
        artista_nome: artistaNome,
        valor_couvert_total: Number(r.valor_couvert_total),
        percentual_repasse: Number(r.percentual_repasse),
        peso: Number(r.peso),
        valor_repasse: Number(r.valor_repasse),
        status: r.status as "pendente" | "pago",
        calculado_em: r.calculado_em,
        pago_em: r.pago_em,
      } as RepasseCouvert;
    });
  });

export const pagarRepassesCouvertFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      ids: z.array(z.string().uuid()).min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: count, error } = await supabase.rpc(
      "pagar_repasses_couvert_artistico",
      { _ids: data.ids },
    );
    if (error) throw new Error(error.message);
    return { count: (count as number | null) ?? 0 };
  });