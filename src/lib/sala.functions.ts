import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { inicioDoDia } from "./data-fuso";

export interface SalaGarcom {
  id: string;
  nome: string;
  restaurante_id: string;
}

export interface SalaMesa {
  id: string;
  numero: string;
  atribuido_em: string;
  minha?: boolean;
}

export interface SalaPedidoItem {
  id: string;
  nome_produto: string;
  quantidade: number;
  observacao: string | null;
  cliente_nome: string | null;
}

export interface SalaPedidoPronto {
  id: string;
  mesa_id: string;
  mesa_numero: string;
  criado_em: string;
  total: number;
  observacao: string | null;
  itens: SalaPedidoItem[];
}

export interface SalaChamado {
  id: string;
  mesa_id: string;
  mesa_numero: string;
  tipo_nome: string;
  tipo_icone: string;
  criado_em: string;
}

export interface SalaDados {
  garcom: SalaGarcom;
  mesas: SalaMesa[];
  pedidos_prontos: SalaPedidoPronto[];
  chamados_pendentes: SalaChamado[];
  permitir_atendimento_cruzado: boolean;
  turno: { id: string; iniciado_em: string } | null;
  garcons_online: number;
}

export interface MesaRestauranteInfo {
  id: string;
  numero: string;
  garcom_id: string | null;
  garcom_nome: string | null;
  sessao_aberta: boolean;
  pedidos_abertos: number;
}

export const carregarSalaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SalaDados | null> => {
    const { supabase, userId } = context;

    const { data: garcom, error: gErr } = await supabase
      .from("garcons")
      .select("id, nome, restaurante_id")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!garcom) return null;

    const restauranteId = garcom.restaurante_id as string;

    const { data: rest } = await supabase
      .from("restaurantes")
      .select("permitir_atendimento_cruzado")
      .eq("id", restauranteId)
      .maybeSingle();
    const permitirCruzado =
      (rest?.permitir_atendimento_cruzado as boolean | undefined) ?? true;

    // Turno aberto deste garçom
    const { data: turnoRow } = await supabase
      .from("garcom_turnos")
      .select("id, iniciado_em")
      .eq("garcom_id", garcom.id as string)
      .is("encerrado_em", null)
      .maybeSingle();
    const turno = turnoRow
      ? { id: turnoRow.id as string, iniciado_em: turnoRow.iniciado_em as string }
      : null;

    // Quantidade de garçons online no restaurante
    const { count: garconsOnline } = await supabase
      .from("garcom_turnos")
      .select("id", { count: "exact", head: true })
      .eq("restaurante_id", restauranteId)
      .is("encerrado_em", null);

    // Quando cruzado ON, lista todas as mesas ativas; senão, só as atribuídas.
    let mesas: SalaMesa[] = [];
    if (permitirCruzado) {
      const { data: ms, error: mErr } = await supabase
        .from("mesas")
        .select("id, numero")
        .eq("restaurante_id", restauranteId)
        .eq("ativa", true)
        .eq("is_virtual", false);
      if (mErr) throw new Error(mErr.message);
      const { data: atribsMinhas } = await supabase
        .from("mesa_garcom")
        .select("mesa_id")
        .eq("restaurante_id", restauranteId)
        .eq("garcom_id", garcom.id as string)
        .is("liberado_em", null);
      const minhasSet = new Set(
        (atribsMinhas ?? []).map((a) => a.mesa_id as string),
      );
      mesas = (ms ?? [])
        .map((m) => ({
          id: m.id as string,
          numero: m.numero as string,
          atribuido_em: "",
          minha: minhasSet.has(m.id as string),
        }))
        .sort((x, y) =>
          x.numero.localeCompare(y.numero, "pt-BR", { numeric: true }),
        );
    } else {
      const { data: atribs, error: aErr } = await supabase
      .from("mesa_garcom")
      .select("mesa_id, atribuido_em")
      .eq("restaurante_id", restauranteId)
      .eq("garcom_id", garcom.id as string)
      .is("liberado_em", null);
      if (aErr) throw new Error(aErr.message);

      const mesaIdsAtrib = Array.from(
        new Set((atribs ?? []).map((a) => a.mesa_id as string)),
      );
      const atribuidoEmByMesa = new Map<string, string>();
      for (const a of atribs ?? []) {
        atribuidoEmByMesa.set(a.mesa_id as string, a.atribuido_em as string);
      }

      if (mesaIdsAtrib.length) {
        const { data: ms, error: mErr } = await supabase
          .from("mesas")
          .select("id, numero")
          .in("id", mesaIdsAtrib);
        if (mErr) throw new Error(mErr.message);
        mesas = (ms ?? [])
          .map((m) => ({
            id: m.id as string,
            numero: m.numero as string,
            atribuido_em: atribuidoEmByMesa.get(m.id as string) ?? "",
            minha: true,
          }))
          .sort((x, y) =>
            x.numero.localeCompare(y.numero, "pt-BR", { numeric: true }),
          );
      }
    }

    const mesaIds = mesas.map((m) => m.id);
    const mesaNumeroById = new Map(mesas.map((m) => [m.id, m.numero]));

    if (mesaIds.length === 0) {
      return {
        garcom: { id: garcom.id, nome: garcom.nome, restaurante_id: restauranteId },
        mesas,
        pedidos_prontos: [],
        chamados_pendentes: [],
        permitir_atendimento_cruzado: permitirCruzado,
        turno,
        garcons_online: garconsOnline ?? 0,
      };
    }

    const inicio = inicioDoDia();

    const { data: peds, error: pErr } = await supabase
      .from("pedidos")
      .select("id, mesa_id, criado_em, total, observacao")
      .eq("restaurante_id", restauranteId)
      .eq("status", "pronto")
      .in("mesa_id", mesaIds)
      .gte("criado_em", inicio.toISOString())
      .order("criado_em", { ascending: true });
    if (pErr) throw new Error(pErr.message);

    const pedidoIds = (peds ?? []).map((p) => p.id as string);
    let itensByPedido = new Map<string, SalaPedidoItem[]>();
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

    const { data: chs, error: cErr } = await supabase
      .from("chamados_garcom")
      .select("id, mesa_id, tipo_chamado_id, criado_em")
      .eq("restaurante_id", restauranteId)
      .eq("status", "pendente")
      .in("mesa_id", mesaIds)
      .order("criado_em", { ascending: true });
    if (cErr) throw new Error(cErr.message);

    const tipoIds = Array.from(new Set((chs ?? []).map((c) => c.tipo_chamado_id as string)));
    const tipoMap = new Map<string, { nome: string; icone: string }>();
    if (tipoIds.length) {
      const { data: tipos } = await supabase
        .from("tipos_chamado")
        .select("id, nome, icone")
        .in("id", tipoIds);
      for (const t of tipos ?? []) {
        tipoMap.set(t.id as string, {
          nome: t.nome as string,
          icone: (t.icone as string) ?? "bell",
        });
      }
    }

    const chamados_pendentes: SalaChamado[] = (chs ?? []).map((c) => {
      const t = tipoMap.get(c.tipo_chamado_id as string);
      return {
        id: c.id as string,
        mesa_id: c.mesa_id as string,
        mesa_numero: mesaNumeroById.get(c.mesa_id as string) ?? "—",
        tipo_nome: t?.nome ?? "Chamado",
        tipo_icone: t?.icone ?? "bell",
        criado_em: c.criado_em as string,
      };
    });

    return {
      garcom: { id: garcom.id, nome: garcom.nome, restaurante_id: restauranteId },
      mesas,
      pedidos_prontos,
      chamados_pendentes,
      permitir_atendimento_cruzado: permitirCruzado,
      turno,
      garcons_online: garconsOnline ?? 0,
    };
  });

export const carregarSalaAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { garcomId: string }) => data)
  .handler(async ({ data, context }): Promise<SalaDados | null> => {
    const { supabase } = context;

    const { data: garcom, error: gErr } = await supabase
      .from("garcons")
      .select("id, nome, restaurante_id")
      .eq("id", data.garcomId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!garcom) return null;

    const restauranteId = garcom.restaurante_id as string;

    const { data: restAdmin } = await supabase
      .from("restaurantes")
      .select("permitir_atendimento_cruzado")
      .eq("id", restauranteId)
      .maybeSingle();
    const permitirCruzadoAdmin =
      (restAdmin?.permitir_atendimento_cruzado as boolean | undefined) ?? true;

    let mesas: SalaMesa[] = [];
    if (permitirCruzadoAdmin) {
      const { data: ms, error: mErr } = await supabase
        .from("mesas")
        .select("id, numero")
        .eq("restaurante_id", restauranteId)
        .eq("ativa", true)
        .eq("is_virtual", false);
      if (mErr) throw new Error(mErr.message);
      mesas = (ms ?? [])
        .map((m) => ({
          id: m.id as string,
          numero: m.numero as string,
          atribuido_em: "",
        }))
        .sort((x, y) =>
          x.numero.localeCompare(y.numero, "pt-BR", { numeric: true }),
        );
    } else {
      const { data: atribs, error: aErr } = await supabase
        .from("mesa_garcom")
        .select("mesa_id, atribuido_em")
        .eq("restaurante_id", restauranteId)
        .eq("garcom_id", garcom.id as string)
        .is("liberado_em", null);
      if (aErr) throw new Error(aErr.message);

      const mesaIdsAtrib = Array.from(
        new Set((atribs ?? []).map((a) => a.mesa_id as string)),
      );
      const atribuidoEmByMesa = new Map<string, string>();
      for (const a of atribs ?? []) {
        atribuidoEmByMesa.set(a.mesa_id as string, a.atribuido_em as string);
      }

      if (mesaIdsAtrib.length) {
        const { data: ms, error: mErr } = await supabase
          .from("mesas")
          .select("id, numero")
          .in("id", mesaIdsAtrib);
        if (mErr) throw new Error(mErr.message);
        mesas = (ms ?? [])
          .map((m) => ({
            id: m.id as string,
            numero: m.numero as string,
            atribuido_em: atribuidoEmByMesa.get(m.id as string) ?? "",
          }))
          .sort((x, y) =>
            x.numero.localeCompare(y.numero, "pt-BR", { numeric: true }),
          );
      }
    }

    const mesaIds = mesas.map((m) => m.id);
    const mesaNumeroById = new Map(mesas.map((m) => [m.id, m.numero]));

    if (mesaIds.length === 0) {
      return {
        garcom: { id: garcom.id, nome: garcom.nome, restaurante_id: restauranteId },
        mesas,
        pedidos_prontos: [],
        chamados_pendentes: [],
        permitir_atendimento_cruzado: permitirCruzadoAdmin,
        turno: null,
        garcons_online: 0,
      };
    }

    const inicio = inicioDoDia();

    const { data: peds, error: pErr } = await supabase
      .from("pedidos")
      .select("id, mesa_id, criado_em, total, observacao")
      .eq("restaurante_id", restauranteId)
      .eq("status", "pronto")
      .in("mesa_id", mesaIds)
      .gte("criado_em", inicio.toISOString())
      .order("criado_em", { ascending: true });
    if (pErr) throw new Error(pErr.message);

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

    const { data: chs, error: cErr } = await supabase
      .from("chamados_garcom")
      .select("id, mesa_id, tipo_chamado_id, criado_em")
      .eq("restaurante_id", restauranteId)
      .eq("status", "pendente")
      .in("mesa_id", mesaIds)
      .order("criado_em", { ascending: true });
    if (cErr) throw new Error(cErr.message);

    const tipoIds = Array.from(new Set((chs ?? []).map((c) => c.tipo_chamado_id as string)));
    const tipoMap = new Map<string, { nome: string; icone: string }>();
    if (tipoIds.length) {
      const { data: tipos } = await supabase
        .from("tipos_chamado")
        .select("id, nome, icone")
        .in("id", tipoIds);
      for (const t of tipos ?? []) {
        tipoMap.set(t.id as string, {
          nome: t.nome as string,
          icone: (t.icone as string) ?? "bell",
        });
      }
    }

    const chamados_pendentes: SalaChamado[] = (chs ?? []).map((c) => {
      const t = tipoMap.get(c.tipo_chamado_id as string);
      return {
        id: c.id as string,
        mesa_id: c.mesa_id as string,
        mesa_numero: mesaNumeroById.get(c.mesa_id as string) ?? "—",
        tipo_nome: t?.nome ?? "Chamado",
        tipo_icone: t?.icone ?? "bell",
        criado_em: c.criado_em as string,
      };
    });

    return {
      garcom: { id: garcom.id, nome: garcom.nome, restaurante_id: restauranteId },
      mesas,
      pedidos_prontos,
      chamados_pendentes,
      permitir_atendimento_cruzado: permitirCruzadoAdmin,
      turno: null,
      garcons_online: 0,
    };
  });

/**
 * Lista todas as mesas ativas do restaurante para o garçom escolher uma
 * mesa que não é dele (atendimento cruzado). Só retorna se a configuração
 * permitir_atendimento_cruzado estiver ativa e o usuário for garçom do
 * restaurante.
 */
export const listarMesasRestauranteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(
    async ({ data, context }): Promise<MesaRestauranteInfo[]> => {
      const { supabase, userId } = context;

      const { data: garcom } = await supabase
        .from("garcons")
        .select("id")
        .eq("user_id", userId)
        .eq("restaurante_id", data.restauranteId)
        .eq("ativo", true)
        .maybeSingle();
      if (!garcom) throw new Error("Garçom não encontrado");

      const { data: rest } = await supabase
        .from("restaurantes")
        .select("permitir_atendimento_cruzado")
        .eq("id", data.restauranteId)
        .maybeSingle();
      if (rest?.permitir_atendimento_cruzado !== true) {
        throw new Error("Atendimento cruzado desativado");
      }

      const { data: mesas, error: mErr } = await supabase
        .from("mesas")
        .select("id, numero")
        .eq("restaurante_id", data.restauranteId)
        .eq("ativa", true)
        .eq("is_virtual", false);
      if (mErr) throw new Error(mErr.message);

      const mesaIds = (mesas ?? []).map((m) => m.id as string);
      if (mesaIds.length === 0) return [];

      const { data: atribs } = await supabase
        .from("mesa_garcom")
        .select("mesa_id, garcom_id, atribuido_em")
        .eq("restaurante_id", data.restauranteId)
        .in("mesa_id", mesaIds)
        .is("liberado_em", null);

      const garcomIdByMesa = new Map<string, string>();
      const atribOrdemByMesa = new Map<string, string>();
      for (const a of atribs ?? []) {
        const mid = a.mesa_id as string;
        const at = (a.atribuido_em as string) ?? "";
        const prev = atribOrdemByMesa.get(mid);
        if (!prev || at > prev) {
          atribOrdemByMesa.set(mid, at);
          garcomIdByMesa.set(mid, a.garcom_id as string);
        }
      }

      const garcomIds = Array.from(new Set(garcomIdByMesa.values()));
      const nomeByGarcom = new Map<string, string>();
      if (garcomIds.length) {
        const { data: gs } = await supabase
          .from("garcons")
          .select("id, nome")
          .in("id", garcomIds);
        for (const g of gs ?? []) {
          nomeByGarcom.set(g.id as string, g.nome as string);
        }
      }

      const { data: sess } = await supabase
        .from("mesa_sessoes")
        .select("mesa_id")
        .eq("restaurante_id", data.restauranteId)
        .eq("status", "aberta")
        .in("mesa_id", mesaIds);
      const sessaoAberta = new Set(
        (sess ?? []).map((s) => s.mesa_id as string),
      );

      const { data: peds } = await supabase
        .from("pedidos")
        .select("mesa_id, status")
        .eq("restaurante_id", data.restauranteId)
        .in("mesa_id", mesaIds)
        .in("status", ["recebido", "em_preparo", "pronto"]);
      const pedidosAbertosPorMesa = new Map<string, number>();
      for (const p of peds ?? []) {
        const mid = p.mesa_id as string;
        pedidosAbertosPorMesa.set(mid, (pedidosAbertosPorMesa.get(mid) ?? 0) + 1);
      }

      const result: MesaRestauranteInfo[] = (mesas ?? [])
        .map((m) => {
          const id = m.id as string;
          const gid = garcomIdByMesa.get(id) ?? null;
          return {
            id,
            numero: m.numero as string,
            garcom_id: gid,
            garcom_nome: gid ? (nomeByGarcom.get(gid) ?? null) : null,
            sessao_aberta: sessaoAberta.has(id),
            pedidos_abertos: pedidosAbertosPorMesa.get(id) ?? 0,
          };
        })
        .sort((x, y) =>
          x.numero.localeCompare(y.numero, "pt-BR", { numeric: true }),
        );

      return result;
    },
  );

/* ---------- Turno do garçom (check-in / check-out) ---------- */

export const abrirTurnoGarcomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ garcomId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: id, error } = await supabase.rpc("abrir_turno_garcom", {
      _garcom_id: data.garcomId,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const encerrarTurnoGarcomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ garcomId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: count, error } = await supabase.rpc("encerrar_turno_garcom", {
      _garcom_id: data.garcomId,
    });
    if (error) throw new Error(error.message);
    return { count: Number(count ?? 0) };
  });

export interface GarcomOnline {
  garcom_id: string;
  iniciado_em: string;
}

export const listarGarconsOnlineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<GarcomOnline[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("garcom_turnos")
      .select("garcom_id, iniciado_em")
      .eq("restaurante_id", data.restauranteId)
      .is("encerrado_em", null);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      garcom_id: r.garcom_id as string,
      iniciado_em: r.iniciado_em as string,
    }));
  });