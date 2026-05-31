import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

    // Carrega configurações de caixa do restaurante (Blocos 6 e 9)
    const { data: rest } = await supabase
      .from("restaurantes")
      .select("caixa_obrigatorio_para_pagamento, caixa_teto_dinheiro")
      .eq("id", data.restauranteId)
      .maybeSingle();

    // Gate de "dono do turno" quando há turno aberto (Bloco 3)
    const { data: turno } = await supabase
      .from("turnos_caixa")
      .select("id, operador_user_id")
      .eq("restaurante_id", data.restauranteId)
      .eq("status", "aberto")
      .maybeSingle();

    // Bloco 9: caixa obrigatório para pagamento
    if (rest?.caixa_obrigatorio_para_pagamento && !turno) {
      throw new Error(
        "É necessário abrir o caixa antes de confirmar pagamentos.",
      );
    }

    if (turno && turno.operador_user_id !== userId) {
      throw new Error("Apenas o operador do turno pode confirmar pagamentos.");
    }

    const { data: id, error } = await supabase.rpc("registrar_pagamento", {
      _comanda_id: data.comandaId,
      _metodo: data.metodo,
      _valor: data.valor,
      _observacao: data.observacao ?? undefined,
    });
    if (error) throw new Error(error.message);

    // Bloco 6: aviso de teto de dinheiro excedido
    let aviso_teto_excedido = false;
    if (
      turno?.id &&
      data.metodo === "dinheiro" &&
      rest?.caixa_teto_dinheiro != null &&
      Number(rest.caixa_teto_dinheiro) > 0
    ) {
      try {
        const { data: totais } = await supabase.rpc("totais_turno_caixa", {
          _turno_id: turno.id,
        });
        const saldoDinheiro = Number(
          (totais as Record<string, unknown> | null)?.["saldo_esperado"] ?? 0,
        );
        if (saldoDinheiro > Number(rest.caixa_teto_dinheiro)) {
          aviso_teto_excedido = true;
          try {
            await supabaseAdmin.from("caixa_eventos").insert({
              restaurante_id: data.restauranteId,
              turno_id: turno.id,
              tipo: "aviso_teto",
              payload: {
                saldo_dinheiro: saldoDinheiro,
                teto: Number(rest.caixa_teto_dinheiro),
                pagamento_id: id as unknown as string,
              } as never,
              ator_user_id: userId,
            });
          } catch {
            // não falhar a operação por erro na auditoria
          }
        }
      } catch {
        // ignora falha de cálculo do teto
      }
    }

    if (turno?.id) {
      try {
        await supabaseAdmin.from("caixa_eventos").insert({
          restaurante_id: data.restauranteId,
          turno_id: turno.id,
          tipo: "pagamento_confirmado",
          payload: {
            comanda_id: data.comandaId,
            metodo: data.metodo,
            valor: data.valor,
          } as never,
          ator_user_id: userId,
        });
      } catch {
        // não falhar a operação por erro na auditoria
      }
    }

    return { id: id as unknown as string, aviso_teto_excedido };
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
  aberta_em: string;
  garcom_id: string | null;
  garcom_nome: string | null;
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
        "id, sessao_id, subtotal, total, total_pago, fechada_em, atualizado_em, criado_em, titular_cliente_id, sessao:mesa_sessoes!inner(mesa_id), titular:clientes(nome)",
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
      criado_em: string;
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
          aberta_em: r.criado_em,
          garcom_id: null as string | null,
          garcom_nome: null as string | null,
        } satisfies ComandaPagamentoPendente;
      })
      .filter((c) => c.restante > 0.0001);

    if (comComSaldo.length === 0) return comComSaldo;

    const mesaIds = Array.from(new Set(comComSaldo.map((c) => c.mesa_id).filter(Boolean)));
    const comandaIds = comComSaldo.map((c) => c.comanda_id);

    const [{ data: mesas }, { data: pags }, { data: atribs }] = await Promise.all([
      mesaIds.length
        ? supabase.from("mesas").select("id, numero").in("id", mesaIds)
        : Promise.resolve({ data: [] as Array<{ id: string; numero: string | null }> }),
      supabase
        .from("pagamentos")
        .select("comanda_id, status")
        .in("comanda_id", comandaIds)
        .eq("status", "pendente"),
      mesaIds.length
        ? supabase
            .from("mesa_garcom")
            .select("mesa_id, garcom_id, atribuido_em, garcom:garcons(nome)")
            .in("mesa_id", mesaIds)
            .is("liberado_em", null)
            .order("atribuido_em", { ascending: false })
        : Promise.resolve({
            data: [] as Array<{
              mesa_id: string;
              garcom_id: string;
              atribuido_em: string;
              garcom: { nome: string | null } | null;
            }>,
          }),
    ]);

    const mesaMap = new Map((mesas ?? []).map((m) => [m.id, m.numero ?? null]));
    const pendMap = new Map<string, number>();
    for (const p of (pags ?? []) as Array<{ comanda_id: string }>) {
      pendMap.set(p.comanda_id, (pendMap.get(p.comanda_id) ?? 0) + 1);
    }
    const garcomMap = new Map<string, { id: string; nome: string | null }>();
    for (const a of (atribs ?? []) as Array<{
      mesa_id: string;
      garcom_id: string;
      garcom: { nome: string | null } | null;
    }>) {
      if (!garcomMap.has(a.mesa_id)) {
        garcomMap.set(a.mesa_id, { id: a.garcom_id, nome: a.garcom?.nome ?? null });
      }
    }

    return comComSaldo.map((c) => ({
      ...c,
      mesa_numero: c.mesa_id ? (mesaMap.get(c.mesa_id) ?? null) : null,
      pagamentos_pendentes: pendMap.get(c.comanda_id) ?? 0,
      garcom_id: c.mesa_id ? (garcomMap.get(c.mesa_id)?.id ?? null) : null,
      garcom_nome: c.mesa_id ? (garcomMap.get(c.mesa_id)?.nome ?? null) : null,
    }));
  });
