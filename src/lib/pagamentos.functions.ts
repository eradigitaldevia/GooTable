import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export type PagamentoMetodo = "pix" | "dinheiro" | "cartao" | "fiado" | "outro";
export type PagamentoStatus = "pendente" | "confirmado" | "cancelado";

export interface Pagamento {
  id: string;
  comanda_id: string;
  restaurante_id: string;
  metodo: PagamentoMetodo;
  valor: number;
  status: PagamentoStatus;
  observacao: string | null;
  confirmado_por: string | null;
  confirmado_em: string | null;
  criado_em: string;
}

export interface ResumoPagamentosComanda {
  pagamentos: Pagamento[];
  total: number;
  total_pago: number;
  saldo: number;
}

export const listarPagamentosComandaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      comandaId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<ResumoPagamentosComanda> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const [{ data: pags, error: pErr }, { data: com, error: cErr }] = await Promise.all([
      supabase
        .from("pagamentos")
        .select(
          "id, comanda_id, restaurante_id, metodo, valor, status, observacao, confirmado_por, confirmado_em, criado_em",
        )
        .eq("comanda_id", data.comandaId)
        .order("criado_em", { ascending: false }),
      supabase
        .from("comandas")
        .select("total, total_pago")
        .eq("id", data.comandaId)
        .maybeSingle(),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (cErr) throw new Error(cErr.message);

    const total = Number(com?.total ?? 0);
    const total_pago = Number(com?.total_pago ?? 0);
    return {
      pagamentos: (pags ?? []) as Pagamento[],
      total,
      total_pago,
      saldo: Math.max(0, total - total_pago),
    };
  });

export const registrarPagamentoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      comandaId: z.string().uuid(),
      metodo: z.enum(["pix", "dinheiro", "cartao", "fiado", "outro"]),
      valor: z.number().positive(),
      observacao: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: id, error } = await supabase.rpc("registrar_pagamento", {
      _comanda_id: data.comandaId,
      _metodo: data.metodo,
      _valor: data.valor,
      _observacao: data.observacao ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export interface ComandaPagamentoPendente {
  comanda_id: string;
  mesa_id: string;
  mesa_numero: string | null;
  titular_nome: string | null;
  subtotal: number;
  total: number;
  total_pago: number;
  restante: number;
  pagamentos_pendentes: number;
  fechada_em: string | null;
  atualizado_em: string;
}

export const listarComandasPagamentoPendenteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<ComandaPagamentoPendente[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: rows, error } = await supabase
      .from("comandas")
      .select(
        "id, sessao_id, subtotal, total, total_pago, fechada_em, atualizado_em, titular_cliente_id, sessao:mesa_sessoes!inner(mesa_id), titular:clientes(nome)",
      )
      .eq("restaurante_id", data.restauranteId)
      .eq("status", "aberta")
      .order("atualizado_em", { ascending: false });
    if (error) throw new Error(error.message);

    type Row = {
      id: string;
      subtotal: number | string | null;
      total: number | string | null;
      total_pago: number | string | null;
      fechada_em: string | null;
      atualizado_em: string;
      sessao: { mesa_id: string } | null;
      titular: { nome: string | null } | null;
    };

    const list = (rows ?? []) as unknown as Row[];
    const comComSaldo = list
      .map((r) => {
        const total = Number(r.total ?? 0);
        const total_pago = Number(r.total_pago ?? 0);
        const restante = Math.max(0, total - total_pago);
        return {
          comanda_id: r.id,
          mesa_id: r.sessao?.mesa_id ?? "",
          mesa_numero: null as string | null,
          titular_nome: r.titular?.nome ?? null,
          subtotal: Number(r.subtotal ?? 0),
          total,
          total_pago,
          restante,
          pagamentos_pendentes: 0,
          fechada_em: r.fechada_em,
          atualizado_em: r.atualizado_em,
        } satisfies ComandaPagamentoPendente;
      })
      .filter((c) => c.restante > 0.0001);

    if (comComSaldo.length === 0) return comComSaldo;

    const mesaIds = Array.from(new Set(comComSaldo.map((c) => c.mesa_id).filter(Boolean)));
    const comandaIds = comComSaldo.map((c) => c.comanda_id);

    const [{ data: mesas }, { data: pags }] = await Promise.all([
      mesaIds.length
        ? supabase.from("mesas").select("id, numero").in("id", mesaIds)
        : Promise.resolve({ data: [] as Array<{ id: string; numero: string | null }> }),
      supabase
        .from("pagamentos")
        .select("comanda_id, status")
        .in("comanda_id", comandaIds)
        .eq("status", "pendente"),
    ]);

    const mesaMap = new Map((mesas ?? []).map((m) => [m.id, m.numero ?? null]));
    const pendMap = new Map<string, number>();
    for (const p of (pags ?? []) as Array<{ comanda_id: string }>) {
      pendMap.set(p.comanda_id, (pendMap.get(p.comanda_id) ?? 0) + 1);
    }

    return comComSaldo.map((c) => ({
      ...c,
      mesa_numero: c.mesa_id ? (mesaMap.get(c.mesa_id) ?? null) : null,
      pagamentos_pendentes: pendMap.get(c.comanda_id) ?? 0,
    }));
  });
