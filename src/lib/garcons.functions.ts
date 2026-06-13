import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";

export interface Garcom {
  id: string;
  restaurante_id: string;
  nome: string;
  telefone: string | null;
  percentual_comissao: number;
  ativo: boolean;
  user_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface AtribuicaoMesa {
  id: string;
  mesa_id: string;
  mesa_numero: string;
  garcom_id: string | null;
  garcom_nome: string | null;
  atribuido_em: string | null;
}

export interface AtribuicaoGarcom {
  id: string;
  garcom_id: string;
  garcom_nome: string;
  atribuido_em: string;
  turno_aberto: boolean;
}

export interface AtribuicaoMesaMulti {
  mesa_id: string;
  mesa_numero: string;
  garcons: AtribuicaoGarcom[];
}

export interface Comissao {
  id: string;
  restaurante_id: string;
  garcom_id: string;
  garcom_nome: string;
  pedido_id: string;
  valor_pedido: number;
  percentual: number;
  valor_comissao: number;
  peso: number;
  status: "pendente" | "pago";
  calculado_em: string;
  pago_em: string | null;
}

export interface ResumoComissaoGarcom {
  garcom_id: string;
  nome: string;
  ativo: boolean;
  percentual: number;
  pendente: number;
  pago: number;
  pedidos_count: number;
}

export interface ComissaoTaxaServico {
  id: string;
  restaurante_id: string;
  garcom_id: string;
  garcom_nome: string;
  comanda_id: string;
  valor_taxa_total: number;
  percentual_repasse: number;
  peso: number;
  valor_repasse: number;
  status: "pendente" | "pago";
  calculado_em: string;
  pago_em: string | null;
}

/* ---------- Garçons (CRUD) ---------- */

export const listarGarconsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        incluirInativos: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabase
      .from("garcons")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("nome", { ascending: true });
    if (!data.incluirInativos) q = q.eq("ativo", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Garcom[];
  });

export const criarGarcomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        nome: z.string().min(1).max(120),
        telefone: z.string().max(40).optional().nullable(),
        percentualComissao: z.number().min(0).max(100),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: row, error } = await supabase
      .from("garcons")
      .insert({
        restaurante_id: data.restauranteId,
        nome: data.nome.trim(),
        telefone: data.telefone?.trim() || null,
        percentual_comissao: data.percentualComissao,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as Garcom;
  });

export const atualizarGarcomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        restauranteId: z.string().uuid(),
        nome: z.string().min(1).max(120),
        telefone: z.string().max(40).optional().nullable(),
        percentualComissao: z.number().min(0).max(100),
        ativo: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("garcons")
      .update({
        nome: data.nome.trim(),
        telefone: data.telefone?.trim() || null,
        percentual_comissao: data.percentualComissao,
        ativo: data.ativo,
      })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Atribuições mesa → garçom ---------- */

export const listarAtribuicoesMesasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: mesas, error: mErr } = await supabase
      .from("mesas")
      .select("id, numero")
      .eq("restaurante_id", data.restauranteId)
      .eq("ativa", true)
      .eq("is_virtual", false)
      .order("numero", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    const { data: atribuicoes, error: aErr } = await supabase
      .from("mesa_garcom")
      .select("id, mesa_id, garcom_id, atribuido_em, garcons:garcom_id(nome)")
      .eq("restaurante_id", data.restauranteId)
      .is("liberado_em", null);
    if (aErr) throw new Error(aErr.message);

    const byMesa = new Map<
      string,
      { id: string; garcom_id: string; garcom_nome: string | null; atribuido_em: string }
    >();
    for (const a of atribuicoes ?? []) {
      const garcomNome = (a as { garcons?: { nome: string } | null }).garcons?.nome ?? null;
      byMesa.set(a.mesa_id, {
        id: a.id,
        garcom_id: a.garcom_id,
        garcom_nome: garcomNome,
        atribuido_em: a.atribuido_em,
      });
    }

    const result: AtribuicaoMesa[] = (mesas ?? []).map((m) => {
      const a = byMesa.get(m.id);
      return {
        id: a?.id ?? m.id,
        mesa_id: m.id,
        mesa_numero: m.numero,
        garcom_id: a?.garcom_id ?? null,
        garcom_nome: a?.garcom_nome ?? null,
        atribuido_em: a?.atribuido_em ?? null,
      };
    });
    return result;
  });

export const listarAtribuicoesMesasMultiFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<AtribuicaoMesaMulti[]> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: mesas, error: mErr } = await supabase
      .from("mesas")
      .select("id, numero")
      .eq("restaurante_id", data.restauranteId)
      .eq("ativa", true)
      .eq("is_virtual", false)
      .order("numero", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    const { data: atrs, error: aErr } = await supabase
      .from("mesa_garcom")
      .select("id, mesa_id, garcom_id, atribuido_em, garcons:garcom_id(nome)")
      .eq("restaurante_id", data.restauranteId)
      .is("liberado_em", null);
    if (aErr) throw new Error(aErr.message);

    const { data: turnos } = await supabase
      .from("garcom_turnos")
      .select("garcom_id")
      .eq("restaurante_id", data.restauranteId)
      .is("encerrado_em", null);
    const abertos = new Set((turnos ?? []).map((t) => t.garcom_id as string));

    const byMesa = new Map<string, AtribuicaoGarcom[]>();
    for (const a of atrs ?? []) {
      const nome =
        (a as { garcons?: { nome: string } | null }).garcons?.nome ?? "—";
      const arr = byMesa.get(a.mesa_id as string) ?? [];
      arr.push({
        id: a.id as string,
        garcom_id: a.garcom_id as string,
        garcom_nome: nome,
        atribuido_em: a.atribuido_em as string,
        turno_aberto: abertos.has(a.garcom_id as string),
      });
      byMesa.set(a.mesa_id as string, arr);
    }

    return (mesas ?? []).map((m) => ({
      mesa_id: m.id as string,
      mesa_numero: m.numero as string,
      garcons: (byMesa.get(m.id as string) ?? []).sort((x, y) =>
        x.atribuido_em.localeCompare(y.atribuido_em),
      ),
    }));
  });

export const atribuirGarcomMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        mesaId: z.string().uuid(),
        garcomId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: id, error } = await supabase.rpc("atribuir_garcom_mesa", {
      _mesa_id: data.mesaId,
      _garcom_id: data.garcomId,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const removerGarcomMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        mesaId: z.string().uuid(),
        garcomId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.rpc("remover_garcom_mesa", {
      _mesa_id: data.mesaId,
      _garcom_id: data.garcomId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const liberarGarcomMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ restauranteId: z.string().uuid(), mesaId: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase.rpc("liberar_garcom_mesa", { _mesa_id: data.mesaId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Comissões ---------- */

export const listarComissoesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        status: z.enum(["pendente", "pago", "todos"]).default("pendente"),
        garcomId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabase
      .from("comissoes")
      .select(
        "id, restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso, status, calculado_em, pago_em, garcons:garcom_id(nome)",
      )
      .eq("restaurante_id", data.restauranteId)
      .order("calculado_em", { ascending: false })
      .limit(500);
    if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.garcomId) q = q.eq("garcom_id", data.garcomId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const nome = (r as { garcons?: { nome: string } | null }).garcons?.nome ?? "—";
      return {
        id: r.id,
        restaurante_id: r.restaurante_id,
        garcom_id: r.garcom_id,
        garcom_nome: nome,
        pedido_id: r.pedido_id,
        valor_pedido: Number(r.valor_pedido),
        percentual: Number(r.percentual),
        valor_comissao: Number(r.valor_comissao),
        peso: Number(r.peso ?? 100),
        status: r.status as "pendente" | "pago",
        calculado_em: r.calculado_em,
        pago_em: r.pago_em,
      } as Comissao;
    });
  });

export const pagarComissoesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: count, error } = await supabase.rpc("pagar_comissoes", { _ids: data.ids });
    if (error) throw new Error(error.message);
    return { count: Number(count ?? 0) };
  });

export const resumoComissoesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: result, error } = await supabase.rpc("resumo_comissoes", {
      _restaurante_id: data.restauranteId,
    });
    if (error) throw new Error(error.message);
    return (result ?? []) as unknown as ResumoComissaoGarcom[];
  });

export const listarComissoesTaxaServicoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        status: z.enum(["pendente", "pago", "todos"]).default("pendente"),
        garcomId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabase
      .from("comissoes_taxa_servico")
      .select(
        "id, restaurante_id, garcom_id, comanda_id, valor_taxa_total, percentual_repasse, peso, valor_repasse, status, calculado_em, pago_em, garcons:garcom_id(nome)",
      )
      .eq("restaurante_id", data.restauranteId)
      .order("calculado_em", { ascending: false })
      .limit(500);
    if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.garcomId) q = q.eq("garcom_id", data.garcomId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const nome = (r as { garcons?: { nome: string } | null }).garcons?.nome ?? "—";
      return {
        id: r.id,
        restaurante_id: r.restaurante_id,
        garcom_id: r.garcom_id,
        garcom_nome: nome,
        comanda_id: r.comanda_id,
        valor_taxa_total: Number(r.valor_taxa_total),
        percentual_repasse: Number(r.percentual_repasse),
        peso: Number(r.peso ?? 0),
        valor_repasse: Number(r.valor_repasse),
        status: r.status as "pendente" | "pago",
        calculado_em: r.calculado_em,
        pago_em: r.pago_em,
      } as ComissaoTaxaServico;
    });
  });