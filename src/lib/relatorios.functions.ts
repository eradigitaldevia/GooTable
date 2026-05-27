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
    total_pagar: number;
  };
  comissoes: RelatorioComissaoLinha[];
  bonus: RelatorioBonusLinha[];
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

    let qb = supabase
      .from("garcom_bonus")
      .select(
        "id, garcom_id, meta_id, periodo_ref, valor, status, calculado_em, garcom_metas:meta_id(nome, tipo)",
      )
      .eq("restaurante_id", data.restauranteId)
      .gte("calculado_em", data.inicio)
      .lte("calculado_em", data.fim)
      .order("calculado_em", { ascending: true })
      .limit(2000);
    if (data.garcomId) qb = qb.eq("garcom_id", data.garcomId);
    const { data: bonusRows, error: bErr } = await qb;
    if (bErr) throw new Error(bErr.message);

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
          total_pagar: 0,
        },
        comissoes: [],
        bonus: [],
      });
    }

    const pedidosVistos = new Map<string, Set<string>>();
    for (const c of comissoesRows ?? []) {
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
      const meta = (b as { garcom_metas?: { nome: string; tipo: string } | null }).garcom_metas;
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

    for (const slot of map.values()) {
      slot.totais.total_pagar =
        slot.totais.comissao_pendente + slot.totais.bonus_pendente;
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