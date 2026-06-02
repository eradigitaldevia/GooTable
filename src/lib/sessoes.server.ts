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
  if (existente) return existente as MesaSessao;

  const { data: criada, error: insErr } = await supabaseAdmin
    .from("mesa_sessoes")
    .insert({ mesa_id: mesaId, restaurante_id: restauranteId })
    .select("id, mesa_id, restaurante_id, status, aberta_em")
    .single();
  if (insErr || !criada) throw new Error(insErr?.message ?? "Falha ao abrir sessão da mesa");
  return criada as MesaSessao;
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
