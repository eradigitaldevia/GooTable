import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export interface RelatorioComissaoLinha {
  id: string;
  pedido_id: string;
  calculado_em: string;
  valor_pedido: number;
  percentual: number;
  peso: number;
  valor_comissao: number;
  status: "pendente" | "pago";
}

export interface RelatorioBonusLinha {
  id: string;
  meta_nome: string;
  meta_tipo: string;
  periodo_ref: string;
  valor: number;
  status: "pendente" | "pago";
  calculado_em: string;
}

export interface RelatorioTaxaServicoLinha {
  id: string;
  comanda_id: string;
  calculado_em: string;
  valor_taxa_total: number;
  percentual_repasse: number;
  peso: number;
  valor_repasse: number;
  status: "pendente" | "pago";
}

export interface RelatorioGarcom {
  garcom_id: string;
  garcom_nome: string;
  totais: {
    pedidos_count: number;
    total_vendido: number;
    comissao_pendente: number;
    comissao_paga: number;
    bonus_pendente: number;
    bonus_pago: number;
    taxa_servico_pendente: number;
    taxa_servico_paga: number;
    total_pagar: number;
  };
  comissoes: RelatorioComissaoLinha[];
  bonus: RelatorioBonusLinha[];
  taxa_servico: RelatorioTaxaServicoLinha[];
}

export interface RelatorioComissoes {
  restaurante: { id: string; nome: string };
  periodo: { inicio: string; fim: string };
  gerado_em: string;
  garcons: RelatorioGarcom[];
}

export const gerarRelatorioComissoesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        garcomId: z.string().uuid().optional(),
        inicio: z.string().min(10),
        fim: z.string().min(10),
        canais: z
          .array(z.enum(["mesa", "balcao", "delivery", "retirada"]))
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: restaurante, error: rErr } = await supabase
      .from("restaurantes")
      .select("id, nome")
      .eq("id", data.restauranteId)
      .single();
    if (rErr) throw new Error(rErr.message);

    let qg = supabase
      .from("garcons")
      .select("id, nome")
      .eq("restaurante_id", data.restauranteId);
    if (data.garcomId) qg = qg.eq("id", data.garcomId);
    const { data: garcons, error: gErr } = await qg;
    if (gErr) throw new Error(gErr.message);

    let qc = supabase
      .from("comissoes")
      .select(
        "id, garcom_id, pedido_id, valor_pedido, percentual, peso, valor_comissao, status, calculado_em",
      )
      .eq("restaurante_id", data.restauranteId)
      .gte("calculado_em", data.inicio)
      .lte("calculado_em", data.fim)
      .order("calculado_em", { ascending: true })
      .limit(5000);
    if (data.garcomId) qc = qc.eq("garcom_id", data.garcomId);
    const { data: comissoesRows, error: cErr } = await qc;
    if (cErr) throw new Error(cErr.message);

    // Filtro por canal (delivery / mesa / etc) — requer lookup em pedidos
    let comissoesFiltradas = comissoesRows ?? [];
    const pedidoCanalMap = new Map<string, string>();
    if (data.canais && data.canais.length > 0 && comissoesFiltradas.length > 0) {
      const pedidoIds = Array.from(new Set(comissoesFiltradas.map((c) => c.pedido_id)));
      const { data: pedsCanal } = await supabase
        .from("pedidos")
        .select("id, canal")
        .in("id", pedidoIds);
      for (const p of pedsCanal ?? []) pedidoCanalMap.set(p.id, p.canal ?? "mesa");
      const allowed = new Set(data.canais);
      comissoesFiltradas = comissoesFiltradas.filter((c) =>
        allowed.has((pedidoCanalMap.get(c.pedido_id) ?? "mesa") as typeof data.canais[number]),
      );
    }

    let qb = supabase
      .from("garcom_bonus")
      .select(
        "id, garcom_id, meta_id, periodo_ref, valor, status, calculado_em",
      )
      .eq("restaurante_id", data.restauranteId)
      .gte("calculado_em", data.inicio)
      .lte("calculado_em", data.fim)
      .order("calculado_em", { ascending: true })
      .limit(2000);
    if (data.garcomId) qb = qb.eq("garcom_id", data.garcomId);
    const { data: bonusRows, error: bErr } = await qb;
    if (bErr) throw new Error(bErr.message);

    let qt = supabase
      .from("comissoes_taxa_servico")
      .select(
        "id, garcom_id, comanda_id, valor_taxa_total, percentual_repasse, peso, valor_repasse, status, calculado_em",
      )
      .eq("restaurante_id", data.restauranteId)
      .gte("calculado_em", data.inicio)
      .lte("calculado_em", data.fim)
      .order("calculado_em", { ascending: true })
      .limit(5000);
    if (data.garcomId) qt = qt.eq("garcom_id", data.garcomId);
    const { data: taxaRows, error: tErr } = await qt;
    if (tErr) throw new Error(tErr.message);

    const metaIds = Array.from(
      new Set((bonusRows ?? []).map((b) => b.meta_id).filter(Boolean) as string[]),
    );
    const metasMap = new Map<string, { nome: string; tipo: string }>();
    if (metaIds.length > 0) {
      const { data: metasRows } = await supabase
        .from("garcom_metas")
        .select("id, nome, tipo")
        .in("id", metaIds);
      for (const m of metasRows ?? []) {
        metasMap.set(m.id, { nome: m.nome, tipo: m.tipo });
      }
    }

    const map = new Map<string, RelatorioGarcom>();
    for (const g of garcons ?? []) {
      map.set(g.id, {
        garcom_id: g.id,
        garcom_nome: g.nome,
        totais: {
          pedidos_count: 0,
          total_vendido: 0,
          comissao_pendente: 0,
          comissao_paga: 0,
          bonus_pendente: 0,
          bonus_pago: 0,
          taxa_servico_pendente: 0,
          taxa_servico_paga: 0,
          total_pagar: 0,
        },
        comissoes: [],
        bonus: [],
        taxa_servico: [],
      });
    }

    const pedidosVistos = new Map<string, Set<string>>();
    for (const c of comissoesFiltradas) {
      const slot = map.get(c.garcom_id);
      if (!slot) continue;
      const valor = Number(c.valor_comissao);
      const valorPedido = Number(c.valor_pedido);
      slot.comissoes.push({
        id: c.id,
        pedido_id: c.pedido_id,
        calculado_em: c.calculado_em,
        valor_pedido: valorPedido,
        percentual: Number(c.percentual),
        peso: Number(c.peso ?? 100),
        valor_comissao: valor,
        status: c.status as "pendente" | "pago",
      });
      if (c.status === "pago") slot.totais.comissao_paga += valor;
      else slot.totais.comissao_pendente += valor;

      let pedidosSet = pedidosVistos.get(c.garcom_id);
      if (!pedidosSet) {
        pedidosSet = new Set();
        pedidosVistos.set(c.garcom_id, pedidosSet);
      }
      if (!pedidosSet.has(c.pedido_id)) {
        pedidosSet.add(c.pedido_id);
        slot.totais.pedidos_count += 1;
        slot.totais.total_vendido += valorPedido;
      }
    }

    for (const b of bonusRows ?? []) {
      const slot = map.get(b.garcom_id);
      if (!slot) continue;
      const meta = b.meta_id ? metasMap.get(b.meta_id) : null;
      const valor = Number(b.valor);
      slot.bonus.push({
        id: b.id,
        meta_nome: meta?.nome ?? "—",
        meta_tipo: meta?.tipo ?? "—",
        periodo_ref: b.periodo_ref,
        valor,
        status: b.status as "pendente" | "pago",
        calculado_em: b.calculado_em,
      });
      if (b.status === "pago") slot.totais.bonus_pago += valor;
      else slot.totais.bonus_pendente += valor;
    }

    for (const t of taxaRows ?? []) {
      const slot = map.get(t.garcom_id);
      if (!slot) continue;
      const valor = Number(t.valor_repasse);
      slot.taxa_servico.push({
        id: t.id,
        comanda_id: t.comanda_id,
        calculado_em: t.calculado_em,
        valor_taxa_total: Number(t.valor_taxa_total),
        percentual_repasse: Number(t.percentual_repasse),
        peso: Number(t.peso ?? 0),
        valor_repasse: valor,
        status: t.status as "pendente" | "pago",
      });
      if (t.status === "pago") slot.totais.taxa_servico_paga += valor;
      else slot.totais.taxa_servico_pendente += valor;
    }

    for (const slot of map.values()) {
      slot.totais.total_pagar =
        slot.totais.comissao_pendente +
        slot.totais.bonus_pendente +
        slot.totais.taxa_servico_pendente;
    }

    const result: RelatorioComissoes = {
      restaurante: { id: restaurante.id, nome: restaurante.nome },
      periodo: { inicio: data.inicio, fim: data.fim },
      gerado_em: new Date().toISOString(),
      garcons: Array.from(map.values()).sort((a, b) =>
        a.garcom_nome.localeCompare(b.garcom_nome, "pt-BR"),
      ),
    };
    return result;
  });