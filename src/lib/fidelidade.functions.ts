import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

export interface ProgramaFidelidade {
  id: string | null;
  ativo: boolean;
  percentual_cashback: number;
  percentual_max_resgate: number;
  validade_dias: number;
  valor_minimo_pedido: number;
}

export const obterProgramaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<ProgramaFidelidade> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: row, error } = await supabaseAdmin
      .from("programa_fidelidade")
      .select(
        "id, ativo, percentual_cashback, percentual_max_resgate, validade_dias, valor_minimo_pedido",
      )
      .eq("restaurante_id", data.restauranteId)
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!row) {
      return {
        id: null,
        ativo: false,
        percentual_cashback: 0,
        percentual_max_resgate: 100,
        validade_dias: 0,
        valor_minimo_pedido: 0,
      };
    }
    return {
      id: row.id as string,
      ativo: Boolean(row.ativo),
      percentual_cashback: Number(row.percentual_cashback ?? 0),
      percentual_max_resgate: Number(row.percentual_max_resgate ?? 100),
      validade_dias: Number(row.validade_dias ?? 0),
      valor_minimo_pedido: Number(row.valor_minimo_pedido ?? 0),
    };
  });

export const salvarProgramaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        ativo: z.boolean(),
        percentual_cashback: z.number().min(0).max(100),
        percentual_max_resgate: z.number().min(0).max(100),
        validade_dias: z.number().int().min(0).max(3650),
        valor_minimo_pedido: z.number().min(0).max(1000000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ProgramaFidelidade> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: existente, error: selErr } = await supabaseAdmin
      .from("programa_fidelidade")
      .select("id")
      .eq("restaurante_id", data.restauranteId)
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    const payload = {
      restaurante_id: data.restauranteId,
      ativo: data.ativo,
      percentual_cashback: data.percentual_cashback,
      percentual_max_resgate: data.percentual_max_resgate,
      validade_dias: data.validade_dias,
      valor_minimo_pedido: data.valor_minimo_pedido,
      atualizado_em: new Date().toISOString(),
    };

    let row: any;
    if (existente?.id) {
      const { data: upd, error } = await supabaseAdmin
        .from("programa_fidelidade")
        .update(payload)
        .eq("id", existente.id as string)
        .select(
          "id, ativo, percentual_cashback, percentual_max_resgate, validade_dias, valor_minimo_pedido",
        )
        .single();
      if (error) throw new Error(error.message);
      row = upd;
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("programa_fidelidade")
        .insert(payload)
        .select(
          "id, ativo, percentual_cashback, percentual_max_resgate, validade_dias, valor_minimo_pedido",
        )
        .single();
      if (error) throw new Error(error.message);
      row = ins;
    }

    return {
      id: row.id as string,
      ativo: Boolean(row.ativo),
      percentual_cashback: Number(row.percentual_cashback ?? 0),
      percentual_max_resgate: Number(row.percentual_max_resgate ?? 100),
      validade_dias: Number(row.validade_dias ?? 0),
      valor_minimo_pedido: Number(row.valor_minimo_pedido ?? 0),
    };
  });
