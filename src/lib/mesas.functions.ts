import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export type SituacaoMesa =
  | "livre"
  | "aguardando"
  | "em_atendimento"
  | "sem_pedidos_ativos";

export interface Mesa {
  id: string;
  numero: string;
  qr_token: string;
  ativa: boolean;
  sessao_aberta: boolean;
  situacao: SituacaoMesa;
  pedidos_ativos: number;
  total_parcial: number;
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
    // mesa_id -> sessao_id (apenas sessões abertas)
    const sessaoPorMesa = new Map<string, string>();
    if (mesaIds.length > 0) {
      const { data: sess } = await supabase
        .from("mesa_sessoes")
        .select("id, mesa_id")
        .eq("restaurante_id", data.restauranteId)
        .eq("status", "aberta")
        .in("mesa_id", mesaIds);
      for (const s of sess ?? []) {
        sessaoPorMesa.set(s.mesa_id as string, s.id as string);
      }
    }

    const sessaoIds = Array.from(sessaoPorMesa.values());
    const pedidosAtivosPorMesa = new Map<string, number>();
    const totalParcialPorMesa = new Map<string, number>();

    if (sessaoIds.length > 0) {
      // pedidos ativos por mesa (recebido/em_preparo/pronto)
      const { data: peds } = await supabase
        .from("pedidos")
        .select("mesa_id, status")
        .eq("restaurante_id", data.restauranteId)
        .in("mesa_id", mesaIds)
        .in("status", ["recebido", "em_preparo", "pronto"]);
      for (const p of peds ?? []) {
        const mid = p.mesa_id as string;
        pedidosAtivosPorMesa.set(
          mid,
          (pedidosAtivosPorMesa.get(mid) ?? 0) + 1,
        );
      }

      // comandas abertas por sessao (consumo lançado)
      const { data: coms } = await supabase
        .from("comandas")
        .select("sessao_id, total")
        .eq("status", "aberta")
        .in("sessao_id", sessaoIds);
      const totalPorSessao = new Map<string, number>();
      for (const c of coms ?? []) {
        const sid = c.sessao_id as string;
        totalPorSessao.set(
          sid,
          (totalPorSessao.get(sid) ?? 0) + Number(c.total ?? 0),
        );
      }
      for (const [mid, sid] of sessaoPorMesa) {
        totalParcialPorMesa.set(mid, totalPorSessao.get(sid) ?? 0);
      }
    }

    return (rows ?? []).map((m) => {
      const id = m.id as string;
      const temSessao = sessaoPorMesa.has(id);
      let situacao: SituacaoMesa = "livre";
      if (temSessao) {
        const ativos = pedidosAtivosPorMesa.get(id) ?? 0;
        const total = totalParcialPorMesa.get(id) ?? 0;
        if (ativos > 0) situacao = "em_atendimento";
        else if (total > 0) situacao = "sem_pedidos_ativos";
        else situacao = "aguardando";
      }
      return {
        id,
        numero: m.numero as string,
        qr_token: m.qr_token as string,
        ativa: m.ativa as boolean,
        sessao_aberta: temSessao,
        situacao,
        pedidos_ativos: pedidosAtivosPorMesa.get(id) ?? 0,
        total_parcial: totalParcialPorMesa.get(id) ?? 0,
      };
    }) as Mesa[];
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
