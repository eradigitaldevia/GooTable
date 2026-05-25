import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

export interface ClienteAdminRow {
  id: string;
  nome: string;
  telefone: string;
  total_gasto: number;
  cashback_saldo: number;
  ultima_visita: string | null;
  ticket_medio: number;
  pedidos_count: number;
}

export interface ListarClientesResultado {
  clientes: ClienteAdminRow[];
  total: number;
}

export const listarClientesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        busca: z.string().trim().max(80).optional().default(""),
        page: z.number().int().min(0).max(10000).default(0),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ListarClientesResultado> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = supabaseAdmin
      .from("clientes")
      .select(
        "id, nome, telefone, total_gasto, cashback_saldo, ultima_visita, ticket_medio, pedidos_count",
        { count: "exact" },
      )
      .eq("restaurante_id", data.restauranteId)
      .order("ultima_visita", { ascending: false, nullsFirst: false })
      .range(from, to);

    const busca = data.busca.trim();
    if (busca) {
      const digits = busca.replace(/\D/g, "");
      if (digits.length >= 3) {
        query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${digits}%`);
      } else {
        query = query.ilike("nome", `%${busca}%`);
      }
    }

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      clientes: (rows ?? []).map((r) => ({
        id: r.id as string,
        nome: r.nome as string,
        telefone: r.telefone as string,
        total_gasto: Number(r.total_gasto ?? 0),
        cashback_saldo: Number(r.cashback_saldo ?? 0),
        ultima_visita: (r.ultima_visita as string | null) ?? null,
        ticket_medio: Number(r.ticket_medio ?? 0),
        pedidos_count: Number(r.pedidos_count ?? 0),
      })),
      total: count ?? 0,
    };
  });

export interface PedidoClienteAdmin {
  id: string;
  total: number;
  status: string;
  criado_em: string;
  cashback_gerado: number;
  cashback_resgatado: number;
}

export interface MovimentoCashbackAdmin {
  id: string;
  tipo: string;
  valor: number;
  observacao: string | null;
  pedido_id: string | null;
  comanda_id: string | null;
  criado_em: string;
}

export interface DetalheClienteResultado {
  cliente: ClienteAdminRow;
  pedidos: PedidoClienteAdmin[];
  movimentos: MovimentoCashbackAdmin[];
}

export const detalheClienteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        clienteId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<DetalheClienteResultado> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: cli, error: cErr } = await supabaseAdmin
      .from("clientes")
      .select(
        "id, nome, telefone, total_gasto, cashback_saldo, ultima_visita, ticket_medio, pedidos_count, restaurante_id",
      )
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cli || cli.restaurante_id !== data.restauranteId) {
      throw new Error("Cliente não encontrado");
    }

    const [{ data: peds, error: pErr }, { data: movs, error: mErr }] = await Promise.all([
      supabaseAdmin
        .from("pedidos")
        .select("id, total, status, criado_em, cashback_gerado, cashback_resgatado")
        .eq("restaurante_id", data.restauranteId)
        .eq("cliente_id", data.clienteId)
        .order("criado_em", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("cashback_movimentos")
        .select("id, tipo, valor, observacao, pedido_id, comanda_id, criado_em")
        .eq("restaurante_id", data.restauranteId)
        .eq("cliente_id", data.clienteId)
        .order("criado_em", { ascending: false })
        .limit(50),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (mErr) throw new Error(mErr.message);

    return {
      cliente: {
        id: cli.id as string,
        nome: cli.nome as string,
        telefone: cli.telefone as string,
        total_gasto: Number(cli.total_gasto ?? 0),
        cashback_saldo: Number(cli.cashback_saldo ?? 0),
        ultima_visita: (cli.ultima_visita as string | null) ?? null,
        ticket_medio: Number(cli.ticket_medio ?? 0),
        pedidos_count: Number(cli.pedidos_count ?? 0),
      },
      pedidos: (peds ?? []).map((p) => ({
        id: p.id as string,
        total: Number(p.total ?? 0),
        status: p.status as string,
        criado_em: p.criado_em as string,
        cashback_gerado: Number(p.cashback_gerado ?? 0),
        cashback_resgatado: Number(p.cashback_resgatado ?? 0),
      })),
      movimentos: (movs ?? []).map((m) => ({
        id: m.id as string,
        tipo: m.tipo as string,
        valor: Number(m.valor ?? 0),
        observacao: (m.observacao as string | null) ?? null,
        pedido_id: (m.pedido_id as string | null) ?? null,
        comanda_id: (m.comanda_id as string | null) ?? null,
        criado_em: m.criado_em as string,
      })),
    };
  });

export const ajustarCashbackFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        clienteId: z.string().uuid(),
        valor: z
          .number()
          .min(-100000)
          .max(100000)
          .refine((v) => v !== 0, "Valor não pode ser zero"),
        observacao: z.string().trim().max(280).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: cli, error: cErr } = await supabaseAdmin
      .from("clientes")
      .select("id, cashback_saldo, restaurante_id")
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cli || cli.restaurante_id !== data.restauranteId) {
      throw new Error("Cliente não encontrado");
    }

    const saldoAtual = Number(cli.cashback_saldo ?? 0);
    const novoSaldo = saldoAtual + data.valor;
    if (novoSaldo < 0) {
      throw new Error("Ajuste deixaria o saldo negativo");
    }

    const { error: insErr } = await supabaseAdmin.from("cashback_movimentos").insert({
      cliente_id: data.clienteId,
      restaurante_id: data.restauranteId,
      tipo: "ajuste",
      valor: data.valor,
      observacao: data.observacao || null,
    });
    if (insErr) throw new Error(insErr.message);

    const { error: upErr } = await supabaseAdmin
      .from("clientes")
      .update({ cashback_saldo: novoSaldo })
      .eq("id", data.clienteId);
    if (upErr) throw new Error(upErr.message);

    return { novo_saldo: novoSaldo };
  });
