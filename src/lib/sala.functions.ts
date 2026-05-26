import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SalaGarcom {
  id: string;
  nome: string;
  restaurante_id: string;
}

export interface SalaMesa {
  id: string;
  numero: string;
  atribuido_em: string;
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

    let mesas: SalaMesa[] = [];
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

    const mesaIds = mesas.map((m) => m.id);
    const mesaNumeroById = new Map(mesas.map((m) => [m.id, m.numero]));

    if (mesaIds.length === 0) {
      return {
        garcom: { id: garcom.id, nome: garcom.nome, restaurante_id: restauranteId },
        mesas,
        pedidos_prontos: [],
        chamados_pendentes: [],
      };
    }

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

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
    };
  });