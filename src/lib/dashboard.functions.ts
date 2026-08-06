import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante, assertPlatformAdmin } from "./auth.server";
import { inicioDoDia, inicioDoMes } from "./data-fuso";

/* ---------- Admin do restaurante: resumo via RPC ---------- */

export interface DashboardAdminResumo {
  emAndamento: number;
  finalizadosHoje: number;
  mesasOcupadas: number;
  faturamentoHoje: number;
  chart7d: { data: string; label: string; valor: number }[];
}

export const dashboardAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<DashboardAdminResumo> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: row, error } = await supabase.rpc("dashboard_admin_resumo", {
      _restaurante_id: data.restauranteId,
    });
    if (error) throw new Error(error.message);
    const r = (row ?? {}) as Record<string, unknown>;
    const chartRaw = (r.chart_7d as { data: string; valor: number | string }[] | undefined) ?? [];
    return {
      emAndamento: Number(r.em_andamento ?? 0),
      finalizadosHoje: Number(r.finalizados_hoje ?? 0),
      mesasOcupadas: Number(r.mesas_ocupadas ?? 0),
      faturamentoHoje: Number(r.faturamento_hoje ?? 0),
      chart7d: chartRaw.map((b) => {
        const d = new Date(b.data + "T00:00:00");
        return {
          data: b.data,
          label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          valor: Number(b.valor),
        };
      }),
    };
  });

/* ---------- Admin: métricas Delivery (hoje) ---------- */

export interface DashboardDeliveryResumo {
  pedidosHoje: number;
  ticketMedio: number;
  faturamentoHoje: number;
}

export const dashboardDeliveryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<DashboardDeliveryResumo> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const inicioDia = inicioDoDia();

    const { data: peds, error } = await supabase
      .from("pedidos")
      .select("total, status, canal")
      .eq("restaurante_id", data.restauranteId)
      .eq("canal", "delivery")
      .gte("criado_em", inicioDia.toISOString());
    if (error) throw new Error(error.message);

    const lista = peds ?? [];
    const pedidosHoje = lista.length;
    const entregues = lista.filter((p) => p.status === "entregue");
    const faturamentoHoje = entregues.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const ticketMedio = entregues.length > 0 ? faturamentoHoje / entregues.length : 0;
    return { pedidosHoje, ticketMedio, faturamentoHoje };
  });

/* ---------- Admin: métricas operacionais ---------- */

export type DashboardMetricasPeriodo = "hoje" | "7d" | "30d";

export interface DashboardMetricasOperacionais {
  fila: {
    recebido: number;
    em_preparo: number;
    pronto: number;
    mais_antigo_min: number;
  };
  tempoFases: {
    recebidoParaPreparoMin: number;
    preparoParaProntoMin: number;
    prontoParaEntregueMin: number;
    cicloTotalMin: number;
  };
  throughput24h: { hora: number; total: number }[];
}

export const dashboardMetricasOperacionaisFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      periodo: z.enum(["hoje", "7d", "30d"]).default("hoje"),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<DashboardMetricasOperacionais> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: row, error } = await supabase.rpc("dashboard_metricas_operacionais", {
      _restaurante_id: data.restauranteId,
      _periodo: data.periodo,
    });
    if (error) throw new Error(error.message);
    const r = (row ?? {}) as Record<string, unknown>;
    const fila = (r.fila ?? {}) as Record<string, unknown>;
    const tf = (r.tempo_fases ?? {}) as Record<string, unknown>;
    const tp = (r.throughput_24h ?? []) as { hora: number | string; total: number | string }[];
    return {
      fila: {
        recebido: Number(fila.recebido ?? 0),
        em_preparo: Number(fila.em_preparo ?? 0),
        pronto: Number(fila.pronto ?? 0),
        mais_antigo_min: Number(fila.mais_antigo_min ?? 0),
      },
      tempoFases: {
        recebidoParaPreparoMin: Number(tf.recebido_para_preparo_min ?? 0),
        preparoParaProntoMin: Number(tf.preparo_para_pronto_min ?? 0),
        prontoParaEntregueMin: Number(tf.pronto_para_entregue_min ?? 0),
        cicloTotalMin: Number(tf.ciclo_total_min ?? 0),
      },
      throughput24h: tp.map((b) => ({ hora: Number(b.hora), total: Number(b.total) })),
    };
  });

/* ---------- Admin: produtos mais vendidos ---------- */

export interface DashboardProdutoTop {
  produto_id: string | null;
  nome: string;
  quantidade: number;
  faturamento: number;
}

export const dashboardProdutosTopFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      periodo: z.enum(["hoje", "7d", "30d"]).default("hoje"),
      limit: z.number().int().min(1).max(50).default(5),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<DashboardProdutoTop[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: rows, error } = await supabase.rpc("dashboard_produtos_top", {
      _restaurante_id: data.restauranteId,
      _periodo: data.periodo,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    const lista = (rows ?? []) as Array<{
      produto_id: string | null;
      nome: string;
      quantidade: number | string;
      faturamento: number | string;
    }>;
    return lista.map((r) => ({
      produto_id: r.produto_id,
      nome: r.nome,
      quantidade: Number(r.quantidade ?? 0),
      faturamento: Number(r.faturamento ?? 0),
    }));
  });

/* ---------- Admin: ticket médio por mesa ---------- */

export interface DashboardTicketMedioMesa {
  ticketMedio: number;
  mesasAtendidas: number;
  faturamentoTotal: number;
}

export const dashboardTicketMedioMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      periodo: z.enum(["hoje", "7d", "30d"]).default("hoje"),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<DashboardTicketMedioMesa> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: row, error } = await supabase.rpc("dashboard_ticket_medio_mesa", {
      _restaurante_id: data.restauranteId,
      _periodo: data.periodo,
    });
    if (error) throw new Error(error.message);
    const r = (row ?? {}) as Record<string, unknown>;
    return {
      ticketMedio: Number(r.ticket_medio ?? 0),
      mesasAtendidas: Number(r.mesas_atendidas ?? 0),
      faturamentoTotal: Number(r.faturamento_total ?? 0),
    };
  });

/* ---------- Super-admin: resumo via RPC ---------- */

export interface SuperadminResumo {
  total: number;
  ativos: number;
  suspensos: number;
  pedidosHoje: number;
  faturamentoHoje: number;
  faturamentoMes: number;
  chart30d: { data: string; total: number }[];
  topRestaurantes: { nome: string; total: number }[];
}

export const dashboardSuperadminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperadminResumo> => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { data: row, error } = await supabase.rpc("dashboard_superadmin_resumo");
    if (error) throw new Error(error.message);
    const r = (row ?? {}) as Record<string, unknown>;
    const chartRaw = (r.chart_30d as { data: string; total: number | string }[] | undefined) ?? [];
    const topRaw = (r.top_restaurantes as { nome: string; total: number | string }[] | undefined) ?? [];
    return {
      total: Number(r.total ?? 0),
      ativos: Number(r.ativos ?? 0),
      suspensos: Number(r.suspensos ?? 0),
      pedidosHoje: Number(r.pedidos_hoje ?? 0),
      faturamentoHoje: Number(r.faturamento_hoje ?? 0),
      faturamentoMes: Number(r.faturamento_mes ?? 0),
      chart30d: chartRaw.map((b) => ({
        data: b.data.slice(5).replace("-", "/"),
        total: Math.round(Number(b.total)),
      })),
      topRestaurantes: topRaw.map((t) => ({ nome: t.nome, total: Number(t.total) })),
    };
  });

/* ---------- Super-admin: lista com métricas do mês ---------- */

export interface RestauranteListItem {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  criado_em: string;
  pedidosMes: number;
  faturamentoMes: number;
  mesas: number;
}

export const listarRestaurantesAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const inicioMes = inicioDoMes();

    const [{ data: rests }, { data: pedidos }, { data: mesas }] = await Promise.all([
      supabaseAdmin
        .from("restaurantes")
        .select("id, nome, slug, ativo, criado_em")
        .order("criado_em", { ascending: false }),
      supabaseAdmin
        .from("pedidos")
        .select("restaurante_id, total, status, criado_em")
        .gte("criado_em", inicioMes.toISOString()),
      supabaseAdmin.from("mesas").select("restaurante_id").eq("is_virtual", false),
    ]);

    const mesasByRest: Record<string, number> = {};
    (mesas ?? []).forEach((m) => {
      mesasByRest[m.restaurante_id] = (mesasByRest[m.restaurante_id] ?? 0) + 1;
    });
    const pedidosByRest: Record<string, number> = {};
    const fatByRest: Record<string, number> = {};
    (pedidos ?? []).forEach((p) => {
      pedidosByRest[p.restaurante_id] = (pedidosByRest[p.restaurante_id] ?? 0) + 1;
      if (p.status === "entregue") {
        fatByRest[p.restaurante_id] = (fatByRest[p.restaurante_id] ?? 0) + Number(p.total);
      }
    });

    return (rests ?? []).map<RestauranteListItem>((r) => ({
      id: r.id,
      nome: r.nome,
      slug: r.slug,
      ativo: r.ativo,
      criado_em: r.criado_em,
      pedidosMes: pedidosByRest[r.id] ?? 0,
      faturamentoMes: fatByRest[r.id] ?? 0,
      mesas: mesasByRest[r.id] ?? 0,
    }));
  });

/* ---------- Super-admin: detalhe do restaurante + últimos pedidos ---------- */

export const detalheRestauranteAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const [{ data: r }, { data: peds }] = await Promise.all([
      supabaseAdmin.from("restaurantes").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin
        .from("pedidos")
        .select("id, total, status, criado_em")
        .eq("restaurante_id", data.id)
        .order("criado_em", { ascending: false })
        .limit(20),
    ]);

    return {
      restaurante: r,
      pedidos: peds ?? [],
    };
  });

export const atualizarRestauranteAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      nome: z.string().trim().min(2).max(100),
      slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
      cor_primaria: z.string().nullable(),
      pix_habilitado: z.boolean(),
      pix_chave: z.string().nullable(),
      pix_nome_titular: z.string().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({
        nome: data.nome,
        slug: data.slug,
        cor_primaria: data.cor_primaria,
        pix_habilitado: data.pix_habilitado,
        pix_chave: data.pix_chave,
        pix_nome_titular: data.pix_nome_titular,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Super-admin: logs ---------- */

export interface LogRow {
  id: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  metadata_json: string | null;
  criado_em: string;
}

export const listarLogsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, acao, entidade, entidade_id, metadata, criado_em")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{
      id: string;
      acao: string;
      entidade: string;
      entidade_id: string | null;
      metadata: unknown;
      criado_em: string;
    }>).map<LogRow>((l) => ({
      id: l.id,
      acao: l.acao,
      entidade: l.entidade,
      entidade_id: l.entidade_id,
      metadata_json:
        l.metadata && typeof l.metadata === "object" && Object.keys(l.metadata as object).length > 0
          ? JSON.stringify(l.metadata)
          : null,
      criado_em: l.criado_em,
    }));
  });
