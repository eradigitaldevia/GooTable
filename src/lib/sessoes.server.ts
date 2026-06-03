/**
 * Helpers server-only para sessões de mesa e comandas.
 * NÃO importar em código cliente.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface MesaSessao {
  id: string;
  mesa_id: string;
  restaurante_id: string;
  status: "aberta" | "fechada";
  aberta_em: string;
}

export interface ComandaResumo {
  id: string;
  tipo: "individual" | "compartilhada";
  titular_cliente_id: string | null;
  titular_nome: string | null;
  status: "aberta" | "fechada";
  participantes: { cliente_id: string; nome: string }[];
}

/** Garante uma sessão `aberta` para a mesa. Cria se não existir. */
export async function garantirSessaoAberta(
  mesaId: string,
  restauranteId: string,
): Promise<MesaSessao> {
  const { data: existente, error: selErr } = await supabaseAdmin
    .from("mesa_sessoes")
    .select("id, mesa_id, restaurante_id, status, aberta_em")
    .eq("mesa_id", mesaId)
    .eq("status", "aberta")
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (existente) {
    // Limpa eventuais comandas órfãs (sem itens e sem vínculos ativos) acumuladas
    // por fluxos antigos antes de devolver a sessão.
    await sanitizarComandasOrfas(existente.id as string);
    return existente as MesaSessao;
  }

  const { data: criada, error: insErr } = await supabaseAdmin
    .from("mesa_sessoes")
    .insert({ mesa_id: mesaId, restaurante_id: restauranteId })
    .select("id, mesa_id, restaurante_id, status, aberta_em")
    .single();
  if (insErr || !criada) throw new Error(insErr?.message ?? "Falha ao abrir sessão da mesa");
  return criada as MesaSessao;
}

/**
 * Fecha comandas `aberta` da sessão que não têm pedidos NEM vínculos ativos.
 * Idempotente — usado para limpar resquícios de "Sem titular" deixados por
 * fluxos antigos de comanda compartilhada.
 */
export async function sanitizarComandasOrfas(sessaoId: string): Promise<number> {
  const { data: abertas, error } = await supabaseAdmin
    .from("comandas")
    .select("id")
    .eq("sessao_id", sessaoId)
    .eq("status", "aberta");
  if (error) throw new Error(error.message);
  const ids = (abertas ?? []).map((c) => c.id as string);
  if (ids.length === 0) return 0;

  const [{ data: pedRows }, { data: vincRows }] = await Promise.all([
    supabaseAdmin
      .from("pedidos")
      .select("comanda_id")
      .in("comanda_id", ids),
    supabaseAdmin
      .from("mesa_sessao_clientes")
      .select("comanda_id")
      .in("comanda_id", ids)
      .is("saiu_em", null),
  ]);
  const comPedidos = new Set(
    (pedRows ?? []).map((r) => r.comanda_id as string).filter(Boolean),
  );
  const comVinculo = new Set(
    (vincRows ?? []).map((r) => r.comanda_id as string).filter(Boolean),
  );
  const orfas = ids.filter((id) => !comPedidos.has(id) && !comVinculo.has(id));
  if (orfas.length === 0) return 0;

  const { error: closeErr } = await supabaseAdmin
    .from("comandas")
    .update({ status: "fechada", fechada_em: new Date().toISOString() })
    .in("id", orfas);
  if (closeErr) throw new Error(closeErr.message);
  return orfas.length;
}

/** Lista comandas abertas da sessão com nomes de titular e participantes. */
export async function listarComandasAtivas(sessaoId: string): Promise<ComandaResumo[]> {
  const { data: comandas, error: cErr } = await supabaseAdmin
    .from("comandas")
    .select("id, tipo, titular_cliente_id, status")
    .eq("sessao_id", sessaoId)
    .eq("status", "aberta")
    .order("criado_em", { ascending: true });
  if (cErr) throw new Error(cErr.message);
  const lista = (comandas ?? []) as Array<{
    id: string;
    tipo: "individual" | "compartilhada";
    titular_cliente_id: string | null;
    status: "aberta" | "fechada";
  }>;
  if (lista.length === 0) return [];

  const comandaIds = lista.map((c) => c.id);
  const { data: vincs, error: vErr } = await supabaseAdmin
    .from("mesa_sessao_clientes")
    .select("comanda_id, cliente_id, clientes:cliente_id(nome)")
    .in("comanda_id", comandaIds);
  if (vErr) throw new Error(vErr.message);

  const titularIds = lista
    .map((c) => c.titular_cliente_id)
    .filter((v): v is string => !!v);
  let titularNomes = new Map<string, string>();
  if (titularIds.length) {
    const { data: ts, error: tErr } = await supabaseAdmin
      .from("clientes")
      .select("id, nome")
      .in("id", titularIds);
    if (tErr) throw new Error(tErr.message);
    titularNomes = new Map((ts ?? []).map((t) => [t.id as string, t.nome as string]));
  }

  const participantesPorComanda = new Map<string, { cliente_id: string; nome: string }[]>();
  for (const v of vincs ?? []) {
    const cid = v.comanda_id as string | null;
    if (!cid) continue;
    if (!participantesPorComanda.has(cid)) participantesPorComanda.set(cid, []);
    const nome = (v as { clientes: { nome: string } | null }).clientes?.nome ?? "";
    participantesPorComanda.get(cid)!.push({ cliente_id: v.cliente_id as string, nome });
  }

  return lista.map((c) => ({
    id: c.id,
    tipo: c.tipo,
    titular_cliente_id: c.titular_cliente_id,
    titular_nome: c.titular_cliente_id ? titularNomes.get(c.titular_cliente_id) ?? null : null,
    status: c.status,
    participantes: participantesPorComanda.get(c.id) ?? [],
  }));
}

/** Cria uma comanda individual para o cliente na sessão. */
export async function criarComandaIndividual(
  sessaoId: string,
  restauranteId: string,
  titularClienteId: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("comandas")
    .insert({
      sessao_id: sessaoId,
      restaurante_id: restauranteId,
      tipo: "individual",
      titular_cliente_id: titularClienteId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao criar comanda");
  return data.id as string;
}

/** Garante uma comanda compartilhada na sessão; cria se não existir. */
export async function garantirComandaCompartilhada(
  sessaoId: string,
  restauranteId: string,
): Promise<string> {
  const { data: existente, error: selErr } = await supabaseAdmin
    .from("comandas")
    .select("id")
    .eq("sessao_id", sessaoId)
    .eq("status", "aberta")
    .eq("tipo", "compartilhada")
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (existente) return existente.id as string;

  const { data: criada, error: insErr } = await supabaseAdmin
    .from("comandas")
    .insert({
      sessao_id: sessaoId,
      restaurante_id: restauranteId,
      tipo: "compartilhada",
      titular_cliente_id: null,
    })
    .select("id")
    .single();
  if (insErr || !criada) throw new Error(insErr?.message ?? "Falha ao criar comanda compartilhada");
  return criada.id as string;
}

/** Vincula cliente à sessão e à comanda. Idempotente. */
export async function vincularClienteSessao(
  sessaoId: string,
  clienteId: string,
  comandaId: string,
): Promise<void> {
  const { data: existente, error: selErr } = await supabaseAdmin
    .from("mesa_sessao_clientes")
    .select("id, comanda_id")
    .eq("sessao_id", sessaoId)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  if (!existente) {
    const { error: insErr } = await supabaseAdmin
      .from("mesa_sessao_clientes")
      .insert({ sessao_id: sessaoId, cliente_id: clienteId, comanda_id: comandaId });
    if (insErr) throw new Error(insErr.message);
    return;
  }

  if (existente.comanda_id !== comandaId) {
    const { error: updErr } = await supabaseAdmin
      .from("mesa_sessao_clientes")
      .update({ comanda_id: comandaId, saiu_em: null })
      .eq("id", existente.id);
    if (updErr) throw new Error(updErr.message);
  }
}

export interface ConflitoMesa {
  mesaId: string;
  numeroMesa: string;
  sessaoId: string;
  comandaId: string;
  comandaTipo: "individual" | "compartilhada";
  podeTransferir: boolean;
}

/**
 * Verifica se o cliente já possui vínculo ativo (saiu_em IS NULL) em uma
 * comanda `aberta` de uma sessão `aberta` em OUTRA mesa do mesmo restaurante.
 * Retorna o conflito (com flag `podeTransferir`) ou `null` quando livre.
 *
 * `podeTransferir = false` quando o próprio cliente já tem pedidos lançados
 * na comanda de origem — nesse caso ele deve encerrar a conta antes.
 */
export async function detectarConflitoMesa(
  clienteId: string,
  restauranteId: string,
  mesaIdAtual: string,
): Promise<ConflitoMesa | null> {
  const { data: vincs, error: vErr } = await supabaseAdmin
    .from("mesa_sessao_clientes")
    .select(
      "sessao_id, comanda_id, mesa_sessoes:sessao_id(id, mesa_id, restaurante_id, status), comandas:comanda_id(id, status, tipo)",
    )
    .eq("cliente_id", clienteId)
    .is("saiu_em", null);
  if (vErr) throw new Error(vErr.message);

  type Row = {
    sessao_id: string | null;
    comanda_id: string | null;
    mesa_sessoes: {
      id: string;
      mesa_id: string;
      restaurante_id: string;
      status: "aberta" | "fechada";
    } | null;
    comandas: {
      id: string;
      status: "aberta" | "fechada";
      tipo: "individual" | "compartilhada";
    } | null;
  };
  const rows = (vincs ?? []) as unknown as Row[];

  const ativo = rows.find((r) => {
    if (!r.mesa_sessoes || !r.comandas) return false;
    if (r.mesa_sessoes.status !== "aberta") return false;
    if (r.comandas.status !== "aberta") return false;
    if (r.mesa_sessoes.restaurante_id !== restauranteId) return false;
    if (r.mesa_sessoes.mesa_id === mesaIdAtual) return false;
    return true;
  });
  if (!ativo || !ativo.mesa_sessoes || !ativo.comandas) return null;

  const { data: mesa, error: mErr } = await supabaseAdmin
    .from("mesas")
    .select("numero")
    .eq("id", ativo.mesa_sessoes.mesa_id)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);

  // Verifica se o cliente tem pedidos lançados na comanda de origem.
  const { data: peds, error: pErr } = await supabaseAdmin
    .from("pedidos")
    .select("id")
    .eq("comanda_id", ativo.comandas.id)
    .eq("cliente_id", clienteId)
    .limit(1);
  if (pErr) throw new Error(pErr.message);
  const podeTransferir = (peds ?? []).length === 0;

  return {
    mesaId: ativo.mesa_sessoes.mesa_id,
    numeroMesa: (mesa?.numero as string) ?? "—",
    sessaoId: ativo.mesa_sessoes.id,
    comandaId: ativo.comandas.id,
    comandaTipo: ativo.comandas.tipo,
    podeTransferir,
  };
}

/**
 * Transfere o cliente da mesa de origem (sessão/comanda já em aberto) para a
 * mesa nova identificada pelo QR. Falha se o cliente já consumiu na origem.
 *
 * - Marca `saiu_em = now()` no vínculo de origem.
 * - Se a comanda de origem for `individual` do próprio cliente e não tiver
 *   pedidos, fecha a comanda; se for compartilhada, apenas remove o vínculo.
 * - Se a sessão de origem não tiver mais comandas abertas nem vínculos
 *   ativos, fecha a sessão.
 * - Garante sessão/comanda na mesa nova (individual) e vincula o cliente.
 */
export async function transferirCliente(
  clienteId: string,
  sessaoOrigemId: string,
  comandaOrigemId: string,
  mesaIdNova: string,
  restauranteId: string,
): Promise<{ sessaoId: string; comandaId: string }> {
  // Valida vínculo de origem.
  const { data: vincOrigem, error: vErr } = await supabaseAdmin
    .from("mesa_sessao_clientes")
    .select("id")
    .eq("sessao_id", sessaoOrigemId)
    .eq("comanda_id", comandaOrigemId)
    .eq("cliente_id", clienteId)
    .is("saiu_em", null)
    .maybeSingle();
  if (vErr) throw new Error(vErr.message);
  if (!vincOrigem) throw new Error("Vínculo de origem não encontrado");

  // Confirma que não há consumo do cliente na comanda de origem.
  const { data: pedsCli, error: pcErr } = await supabaseAdmin
    .from("pedidos")
    .select("id")
    .eq("comanda_id", comandaOrigemId)
    .eq("cliente_id", clienteId)
    .limit(1);
  if (pcErr) throw new Error(pcErr.message);
  if ((pedsCli ?? []).length > 0) {
    throw new Error(
      "Você já tem pedidos lançados nesta conta. Procure um garçom para encerrar antes de mudar de mesa.",
    );
  }

  // Encerra vínculo de origem.
  const { error: updVErr } = await supabaseAdmin
    .from("mesa_sessao_clientes")
    .update({ saiu_em: new Date().toISOString() })
    .eq("id", vincOrigem.id);
  if (updVErr) throw new Error(updVErr.message);

  // Trata comanda de origem.
  const { data: comandaOrigem, error: coErr } = await supabaseAdmin
    .from("comandas")
    .select("id, tipo, titular_cliente_id, status")
    .eq("id", comandaOrigemId)
    .maybeSingle();
  if (coErr) throw new Error(coErr.message);

  if (comandaOrigem && comandaOrigem.status === "aberta") {
    if (
      comandaOrigem.tipo === "individual" &&
      comandaOrigem.titular_cliente_id === clienteId
    ) {
      // Sem pedidos do cliente já garantido acima; checa qualquer pedido na comanda.
      const { data: anyPeds, error: apErr } = await supabaseAdmin
        .from("pedidos")
        .select("id")
        .eq("comanda_id", comandaOrigemId)
        .limit(1);
      if (apErr) throw new Error(apErr.message);
      if ((anyPeds ?? []).length === 0) {
        const { error: closeErr } = await supabaseAdmin
          .from("comandas")
          .update({ status: "fechada", fechada_em: new Date().toISOString() })
          .eq("id", comandaOrigemId);
        if (closeErr) throw new Error(closeErr.message);
      }
    }
  }

  // Fecha sessão de origem se vazia.
  const { data: outrasComandas, error: ocErr } = await supabaseAdmin
    .from("comandas")
    .select("id")
    .eq("sessao_id", sessaoOrigemId)
    .eq("status", "aberta")
    .limit(1);
  if (ocErr) throw new Error(ocErr.message);
  if ((outrasComandas ?? []).length === 0) {
    const { data: outrosVincs, error: ovErr } = await supabaseAdmin
      .from("mesa_sessao_clientes")
      .select("id")
      .eq("sessao_id", sessaoOrigemId)
      .is("saiu_em", null)
      .limit(1);
    if (ovErr) throw new Error(ovErr.message);
    if ((outrosVincs ?? []).length === 0) {
      const { error: closeSessErr } = await supabaseAdmin
        .from("mesa_sessoes")
        .update({ status: "fechada", fechada_em: new Date().toISOString() })
        .eq("id", sessaoOrigemId);
      if (closeSessErr) throw new Error(closeSessErr.message);
    }
  }

  // Abre/vincula na mesa nova.
  const sessaoNova = await garantirSessaoAberta(mesaIdNova, restauranteId);
  const comandaNovaId = await criarComandaIndividual(
    sessaoNova.id,
    restauranteId,
    clienteId,
  );
  await vincularClienteSessao(sessaoNova.id, clienteId, comandaNovaId);

  return { sessaoId: sessaoNova.id, comandaId: comandaNovaId };
}

/* ============================================================
 * Juntar comandas (garçom/caixa no fechamento)
 * ============================================================ */

export interface JuntarComandasResultado {
  comandaDestinoId: string;
  origensFechadas: string[];
}

/**
 * Junta N comandas `aberta` da mesma sessão em uma única comanda destino.
 * - Reutiliza a comanda mais antiga do conjunto como destino (preserva histórico).
 * - Tipo/titular do destino são definidos pelos parâmetros (sempre perguntados na UI).
 * - Move pedidos e vínculos de clientes; fecha as origens.
 * - Bloqueia se qualquer origem tem pagamento confirmado.
 */
export async function juntarComandas(
  sessaoId: string,
  comandaIds: string[],
  titularClienteId: string | null,
): Promise<JuntarComandasResultado> {
  if (comandaIds.length < 2) {
    throw new Error("Selecione ao menos 2 comandas para juntar.");
  }

  const { data: comandas, error: cErr } = await supabaseAdmin
    .from("comandas")
    .select(
      "id, sessao_id, status, restaurante_id, criado_em, total_pago, cashback_resgatado, desconto_cupom, cupom_id",
    )
    .in("id", comandaIds);
  if (cErr) throw new Error(cErr.message);
  const lista = (comandas ?? []) as Array<{
    id: string;
    sessao_id: string;
    status: "aberta" | "fechada";
    restaurante_id: string;
    criado_em: string;
    total_pago: number | string;
    cashback_resgatado: number | string;
    desconto_cupom: number | string;
    cupom_id: string | null;
  }>;

  if (lista.length !== comandaIds.length) {
    throw new Error("Alguma comanda informada não foi encontrada.");
  }
  for (const c of lista) {
    if (c.sessao_id !== sessaoId) throw new Error("Comandas de sessões diferentes.");
    if (c.status !== "aberta") throw new Error("Apenas comandas abertas podem ser juntadas.");
  }

  // Bloqueia se qualquer origem tem pagamento confirmado.
  const { data: pags, error: pagErr } = await supabaseAdmin
    .from("pagamentos")
    .select("comanda_id")
    .in("comanda_id", comandaIds)
    .eq("status", "confirmado")
    .limit(1);
  if (pagErr) throw new Error(pagErr.message);
  if ((pags ?? []).length > 0) {
    throw new Error(
      "Uma das comandas já possui pagamento confirmado. Não é possível juntar.",
    );
  }

  const restauranteId = lista[0].restaurante_id;

  if (titularClienteId) {
    // Valida titular pertence ao restaurante.
    const { data: cli, error: clErr } = await supabaseAdmin
      .from("clientes")
      .select("id, restaurante_id")
      .eq("id", titularClienteId)
      .maybeSingle();
    if (clErr) throw new Error(clErr.message);
    if (!cli || cli.restaurante_id !== restauranteId) {
      throw new Error("Titular inválido.");
    }
  }

  // Destino = mais antiga.
  const ordenadas = [...lista].sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1));
  const destino = ordenadas[0];
  const origens = ordenadas.slice(1);
  const origensIds = origens.map((c) => c.id);

  // Atualiza tipo/titular do destino.
  const novoTipo: "individual" | "compartilhada" = titularClienteId
    ? "individual"
    : "compartilhada";
  const { error: updDestErr } = await supabaseAdmin
    .from("comandas")
    .update({
      tipo: novoTipo,
      titular_cliente_id: titularClienteId,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", destino.id);
  if (updDestErr) throw new Error(updDestErr.message);

  // Move pedidos.
  if (origensIds.length > 0) {
    const { error: pmErr } = await supabaseAdmin
      .from("pedidos")
      .update({ comanda_id: destino.id })
      .in("comanda_id", origensIds);
    if (pmErr) throw new Error(pmErr.message);

    // Move vínculos ativos de clientes.
    const { error: vmErr } = await supabaseAdmin
      .from("mesa_sessao_clientes")
      .update({ comanda_id: destino.id })
      .in("comanda_id", origensIds)
      .is("saiu_em", null);
    if (vmErr) throw new Error(vmErr.message);
  }

  // Recalcula totais da destino somando subtotais dos pedidos + ajustes.
  const { data: pedsDest, error: pdErr } = await supabaseAdmin
    .from("pedidos")
    .select("total")
    .eq("comanda_id", destino.id);
  if (pdErr) throw new Error(pdErr.message);
  const subtotalDestino = (pedsDest ?? []).reduce(
    (acc, p) => acc + Number(p.total ?? 0),
    0,
  );
  const descontoTotal = lista.reduce(
    (acc, c) => acc + Number(c.desconto_cupom ?? 0),
    0,
  );
  const cashbackTotal = lista.reduce(
    (acc, c) => acc + Number(c.cashback_resgatado ?? 0),
    0,
  );
  const totalPagoTotal = lista.reduce(
    (acc, c) => acc + Number(c.total_pago ?? 0),
    0,
  );
  const totalDestino = Math.max(0, subtotalDestino - descontoTotal - cashbackTotal);

  const { error: totErr } = await supabaseAdmin
    .from("comandas")
    .update({
      subtotal: subtotalDestino,
      desconto_cupom: descontoTotal,
      cashback_resgatado: cashbackTotal,
      total: totalDestino,
      total_pago: totalPagoTotal,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", destino.id);
  if (totErr) throw new Error(totErr.message);

  // Fecha as origens (zera totais — pedidos foram migrados).
  if (origensIds.length > 0) {
    const { error: closeErr } = await supabaseAdmin
      .from("comandas")
      .update({
        status: "fechada",
        fechada_em: new Date().toISOString(),
        subtotal: 0,
        total: 0,
        total_pago: 0,
        cashback_resgatado: 0,
        desconto_cupom: 0,
      })
      .in("id", origensIds);
    if (closeErr) throw new Error(closeErr.message);
  }

  return { comandaDestinoId: destino.id, origensFechadas: origensIds };
}

/* ============================================================
 * Dividir total entre N (gera plano de pagamento, não fragmenta)
 * ============================================================ */

export type ModoDivisao =
  | { tipo: "igual"; n: number }
  | { tipo: "por_participante"; clienteIds: string[] }
  | { tipo: "por_item"; atribuicoes: { itemId: string; clienteId: string | null }[] };

export interface FatiaDivisao {
  label: string;
  valor: number;
  cliente_id: string | null;
}

export interface DivisaoContaResultado {
  total: number;
  fatias: FatiaDivisao[];
  comandas_envolvidas: string[];
}

/**
 * Calcula um plano de divisão da conta. Não altera o banco — apenas devolve
 * fatias para que a UI registre pagamentos parciais nas comandas via
 * `registrar_pagamento`. O arredondamento joga a sobra de centavos na última
 * fatia.
 */
export async function gerarDivisaoConta(
  sessaoId: string,
  comandaIds: string[],
  modo: ModoDivisao,
): Promise<DivisaoContaResultado> {
  if (comandaIds.length === 0) throw new Error("Selecione ao menos uma comanda.");

  const { data: comandas, error: cErr } = await supabaseAdmin
    .from("comandas")
    .select("id, sessao_id, status, total, total_pago")
    .in("id", comandaIds);
  if (cErr) throw new Error(cErr.message);
  const lista = (comandas ?? []) as Array<{
    id: string;
    sessao_id: string;
    status: string;
    total: number | string;
    total_pago: number | string;
  }>;
  if (lista.length !== comandaIds.length) throw new Error("Comanda inválida.");
  for (const c of lista) {
    if (c.sessao_id !== sessaoId) throw new Error("Comandas de sessões diferentes.");
  }
  const totalRestante = lista.reduce(
    (acc, c) => acc + Math.max(0, Number(c.total ?? 0) - Number(c.total_pago ?? 0)),
    0,
  );

  const round2 = (v: number) => Math.round(v * 100) / 100;

  let fatias: FatiaDivisao[] = [];

  if (modo.tipo === "igual") {
    if (modo.n < 1) throw new Error("Divisor inválido.");
    const base = round2(totalRestante / modo.n);
    fatias = Array.from({ length: modo.n }, (_, i) => ({
      label: `Parte ${i + 1}/${modo.n}`,
      valor: base,
      cliente_id: null,
    }));
    const soma = round2(base * modo.n);
    const diff = round2(totalRestante - soma);
    if (diff !== 0 && fatias.length > 0) {
      fatias[fatias.length - 1].valor = round2(fatias[fatias.length - 1].valor + diff);
    }
  } else if (modo.tipo === "por_participante") {
    if (modo.clienteIds.length === 0)
      throw new Error("Selecione ao menos 1 participante.");
    const { data: cls } = await supabaseAdmin
      .from("clientes")
      .select("id, nome")
      .in("id", modo.clienteIds);
    const nomes = new Map((cls ?? []).map((c) => [c.id as string, c.nome as string]));
    const n = modo.clienteIds.length;
    const base = round2(totalRestante / n);
    fatias = modo.clienteIds.map((cid, i) => ({
      label: nomes.get(cid) ?? `Cliente ${i + 1}`,
      valor: base,
      cliente_id: cid,
    }));
    const soma = round2(base * n);
    const diff = round2(totalRestante - soma);
    if (diff !== 0 && fatias.length > 0) {
      fatias[fatias.length - 1].valor = round2(fatias[fatias.length - 1].valor + diff);
    }
  } else {
    // Por item: soma os subtotais de cada item por cliente atribuído.
    const { data: peds } = await supabaseAdmin
      .from("pedidos")
      .select("id")
      .in("comanda_id", comandaIds);
    const pedidoIds = (peds ?? []).map((p) => p.id as string);
    if (pedidoIds.length === 0) {
      return { total: 0, fatias: [], comandas_envolvidas: comandaIds };
    }
    const { data: itens } = await supabaseAdmin
      .from("pedido_itens")
      .select("id, quantidade, preco_unit")
      .in("pedido_id", pedidoIds);
    const subtotalPorItem = new Map<string, number>();
    for (const it of itens ?? []) {
      const sub = Number(it.preco_unit) * Number(it.quantidade);
      subtotalPorItem.set(it.id as string, sub);
    }

    const porCliente = new Map<string | "_sem", number>();
    for (const a of modo.atribuicoes) {
      const sub = subtotalPorItem.get(a.itemId);
      if (sub == null) continue;
      const key = a.clienteId ?? "_sem";
      porCliente.set(key, (porCliente.get(key) ?? 0) + sub);
    }
    const clienteIds = Array.from(porCliente.keys()).filter(
      (k): k is string => k !== "_sem",
    );
    const nomes = new Map<string, string>();
    if (clienteIds.length > 0) {
      const { data: cls } = await supabaseAdmin
        .from("clientes")
        .select("id, nome")
        .in("id", clienteIds);
      for (const c of cls ?? []) nomes.set(c.id as string, c.nome as string);
    }
    fatias = Array.from(porCliente.entries())
      .filter(([, v]) => v > 0.0001)
      .map(([key, valor]) => ({
        label: key === "_sem" ? "Sem atribuição" : nomes.get(key) ?? "Cliente",
        valor: round2(valor),
        cliente_id: key === "_sem" ? null : key,
      }));
  }

  return {
    total: round2(totalRestante),
    fatias,
    comandas_envolvidas: comandaIds,
  };
}
