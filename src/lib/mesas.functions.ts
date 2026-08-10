import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export interface Mesa {
  id: string;
  numero: string;
  qr_token: string;
  ativa: boolean;
  sessao_aberta: boolean;
}

export const listarMesasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: rows, error } = await supabase
      .from("mesas")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .eq("is_virtual", false)
      .order("numero");
    if (error) throw new Error(error.message);

    const mesaIds = (rows ?? []).map((m) => m.id as string);
    let sessaoAberta = new Set<string>();
    if (mesaIds.length > 0) {
      const { data: sess } = await supabase
        .from("mesa_sessoes")
        .select("mesa_id")
        .eq("restaurante_id", data.restauranteId)
        .eq("status", "aberta")
        .in("mesa_id", mesaIds);
      sessaoAberta = new Set((sess ?? []).map((s) => s.mesa_id as string));
    }

    return (rows ?? []).map((m) => ({
      id: m.id as string,
      numero: m.numero as string,
      qr_token: m.qr_token as string,
      ativa: m.ativa as boolean,
      sessao_aberta: sessaoAberta.has(m.id as string),
    })) as Mesa[];
  });

export const criarMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      numero: z.string().trim().min(1).max(40),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("mesas")
      .insert({ restaurante_id: data.restauranteId, numero: data.numero });
    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        throw new Error("Já existe uma mesa com esse número");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const alterarMesaAtivaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      restauranteId: z.string().uuid(),
      ativa: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("mesas")
      .update({ ativa: data.ativa })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("mesas")
      .delete()
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
