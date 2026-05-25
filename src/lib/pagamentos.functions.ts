import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export type PagamentoMetodo = "pix" | "dinheiro" | "outro";
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
      metodo: z.enum(["pix", "dinheiro", "outro"]),
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
