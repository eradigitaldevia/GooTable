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
