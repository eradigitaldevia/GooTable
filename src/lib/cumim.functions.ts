import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import { inicioDoDia } from "./data-fuso";
import type { SalaPedidoPronto, SalaPedidoItem } from "./sala.functions";

export interface CumimEntregaRecente {
  pedido_id: string;
  mesa_numero: string;
  pronto_em: string | null;
  entregue_em: string;
  tempo_entrega_min: number | null;
}

export interface CumimDados {
  cumim: { id: string; nome: string; restaurante_id: string };
  pedidos_prontos: SalaPedidoPronto[];
  entregas_turno: number;
  tempo_medio_entrega_min: number | null;
  ultimas_entregas: CumimEntregaRecente[];
}

/* ---------- Helpers ---------- */

async function montarDadosCumim(
  supabase: Parameters<typeof assertAcessoRestaurante>[0],
  cumimId: string,
  cumimNome: string,
  restauranteId: string,
): Promise<CumimDados> {
  const inicioDia = inicioDoDia();

  // Pratos prontos
  const { data: peds, error: pErr } = await supabase
    .from("pedidos")
    .select("id, mesa_id, criado_em, total, observacao")
    .eq("restaurante_id", restauranteId)
    .eq("status", "pronto")
    .gte("criado_em", inicioDia.toISOString())
    .order("criado_em", { ascending: true });
  if (pErr) throw new Error(pErr.message);

  const mesaIds = Array.from(new Set((peds ?? []).map((p) => p.mesa_id as string)));
  const mesaNumeroById = new Map<string, string>();
  if (mesaIds.length) {
    const { data: ms } = await supabase
      .from("mesas")
      .select("id, numero")
      .in("id", mesaIds);
    for (const m of ms ?? []) {
      mesaNumeroById.set(m.id as string, m.numero as string);
    }
  }

  const pedidoIds = (peds ?? []).map((p) => p.id as string);
  const itensByPedido = new Map<string, SalaPedidoItem[]>();
  if (pedidoIds.length) {
    const { data: its, error: iErr } = await supabase
      .from("pedido_itens")
      .select("id, pedido_id, nome_produto, quantidade, observacao, cliente_nome")
      .in("pedido_id", pedidoIds);
    if (iErr) throw new Error(iErr.message);
    for (const it of its ?? []) {
      const arr = itensByPedido.get(it.pedido_id as string) ?? [];
      arr.push({
        id: it.id as string,
        nome_produto: it.nome_produto as string,
        quantidade: it.quantidade as number,
        observacao: (it.observacao as string | null) ?? null,
        cliente_nome: (it.cliente_nome as string | null) ?? null,
      });
      itensByPedido.set(it.pedido_id as string, arr);
    }
  }

  const pedidos_prontos: SalaPedidoPronto[] = (peds ?? []).map((p) => ({
    id: p.id as string,
    mesa_id: p.mesa_id as string,
    mesa_numero: mesaNumeroById.get(p.mesa_id as string) ?? "—",
    criado_em: p.criado_em as string,
    total: Number(p.total ?? 0),
    observacao: (p.observacao as string | null) ?? null,
    itens: itensByPedido.get(p.id as string) ?? [],
  }));

  // Entregas deste cumim no turno (desde 00h)
  const { data: entregas, error: eErr } = await supabase
    .from("pedidos")
    .select("id, mesa_id, criado_em, entregue_em")
    .eq("restaurante_id", restauranteId)
    .eq("entregue_por_cumim_id", cumimId)
    .gte("entregue_em", inicioDia.toISOString())
    .order("entregue_em", { ascending: false });
  if (eErr) throw new Error(eErr.message);

  const entregasArr = entregas ?? [];
  const tempos: number[] = [];
  for (const e of entregasArr) {
    const pronto = e.criado_em as string | null;
    const entr = e.entregue_em as string | null;
    if (pronto && entr) {
      const diff = (new Date(entr).getTime() - new Date(pronto).getTime()) / 60000;
      if (Number.isFinite(diff) && diff >= 0) tempos.push(diff);
    }
  }
  const tempoMedio = tempos.length
    ? Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) / 10
    : null;

  // Resolver mesa_numero para últimas entregas
  const mesaIdsEntregas = Array.from(
    new Set(entregasArr.map((e) => e.mesa_id as string)),
  );
  const mesaNomeEntregaById = new Map<string, string>();
  for (const id of mesaIdsEntregas) {
    if (mesaNumeroById.has(id)) {
      mesaNomeEntregaById.set(id, mesaNumeroById.get(id)!);
    }
  }
  const faltam = mesaIdsEntregas.filter((id) => !mesaNomeEntregaById.has(id));
  if (faltam.length) {
    const { data: ms2 } = await supabase
      .from("mesas")
      .select("id, numero")
      .in("id", faltam);
    for (const m of ms2 ?? []) {
      mesaNomeEntregaById.set(m.id as string, m.numero as string);
    }
  }

  const ultimas_entregas: CumimEntregaRecente[] = entregasArr.slice(0, 10).map((e) => {
    const pronto = e.criado_em as string | null;
    const entr = e.entregue_em as string;
    const tempo =
      pronto && entr
        ? Math.round(((new Date(entr).getTime() - new Date(pronto).getTime()) / 60000) * 10) / 10
        : null;
    return {
      pedido_id: e.id as string,
      mesa_numero: mesaNomeEntregaById.get(e.mesa_id as string) ?? "—",
      pronto_em: pronto,
      entregue_em: entr,
      tempo_entrega_min: tempo,
    };
  });

  return {
    cumim: { id: cumimId, nome: cumimNome, restaurante_id: restauranteId },
    pedidos_prontos,
    entregas_turno: entregasArr.length,
    tempo_medio_entrega_min: tempoMedio,
    ultimas_entregas,
  };
}

/* ---------- Painel do cumim (usuário logado) ---------- */

export const carregarCumimDadosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CumimDados | null> => {
    const { supabase, userId } = context;

    const { data: cumim, error: cErr } = await supabase
      .from("cumins")
      .select("id, nome, restaurante_id")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cumim) return null;

    return montarDadosCumim(
      supabase,
      cumim.id as string,
      cumim.nome as string,
      cumim.restaurante_id as string,
    );
  });

/* ---------- Admin: visualizar painel de um cumim específico ---------- */

export const carregarCumimAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ cumimId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<CumimDados | null> => {
    const { supabase, userId } = context;

    const { data: cumim, error: cErr } = await supabase
      .from("cumins")
      .select("id, nome, restaurante_id")
      .eq("id", data.cumimId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cumim) return null;

    await assertAcessoRestaurante(
      supabase,
      userId,
      cumim.restaurante_id as string,
    );

    return montarDadosCumim(
      supabase,
      cumim.id as string,
      cumim.nome as string,
      cumim.restaurante_id as string,
    );
  });

/* ---------- Confirmar entrega (cumim) ---------- */

export const confirmarEntregaCumimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pedidoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: cumim, error: cErr } = await supabase
      .from("cumins")
      .select("id, restaurante_id")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cumim) throw new Error("Cumim não encontrado");

    const restauranteId = cumim.restaurante_id as string;

    // UPDATE atômico: só confirma se ainda está 'pronto' e pertence ao restaurante
    const { data: updated, error } = await supabase
      .from("pedidos")
      .update({
        status: "entregue",
        entregue_por_cumim_id: cumim.id as string,
        entregue_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", data.pedidoId)
      .eq("restaurante_id", restauranteId)
      .eq("status", "pronto")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) {
      throw new Error("Pedido já entregue ou indisponível");
    }

    // Cashback do cliente (mesma regra usada em atualizarStatusPedidoFn)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: rpcErr } = await supabaseAdmin.rpc(
      "creditar_cashback_pedido",
      { _pedido_id: data.pedidoId },
    );
    if (rpcErr) throw new Error(rpcErr.message);

    return { ok: true };
  });