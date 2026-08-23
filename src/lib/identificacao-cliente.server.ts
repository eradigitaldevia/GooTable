import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  criarComandaIndividual,
  garantirSessaoAberta,
  vincularClienteSessao,
} from "./sessoes.server";

/** Mensagem única para confirmação inválida (não revela qual campo errou). */
export const CONFIRMACAO_INVALIDA_MENSAGEM =
  "Dados não conferem. Verifique o nome e os 4 últimos dígitos do telefone.";

export interface MesaQr {
  id: string;
  restaurante_id: string;
}

/** Resolve a mesa ativa a partir do QR Token e valida o restaurante. */
export async function resolverMesaAtivaPorQr(qrToken: string): Promise<MesaQr> {
  const { data: mesa, error: mErr } = await supabaseAdmin
    .from("mesas")
    .select("id, restaurante_id, ativa")
    .eq("qr_token", qrToken)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!mesa || !mesa.ativa) throw new Error("Mesa indisponível");

  const { data: rest, error: rErr } = await supabaseAdmin
    .from("restaurantes")
    .select("ativo")
    .eq("id", mesa.restaurante_id)
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);
  if (!rest?.ativo) throw new Error("Restaurante indisponível");

  return { id: mesa.id as string, restaurante_id: mesa.restaurante_id as string };
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Confere nome + 4 últimos dígitos do telefone. O nome é aceito tanto
 * completo quanto apenas o primeiro nome, sem distinção de acentos/caixa.
 */
export function confirmacaoIdentidadeConfere(params: {
  nomeCadastro: string;
  telefoneCadastro: string;
  nomeInformado: string;
  ultimos4: string;
}): boolean {
  const digitos = params.telefoneCadastro.replace(/\D/g, "");
  if (digitos.slice(-4) !== params.ultimos4.replace(/\D/g, "").slice(-4)) return false;

  const cadastro = normalizar(params.nomeCadastro);
  const informado = normalizar(params.nomeInformado);
  if (!informado) return false;
  const primeiroCadastro = cadastro.split(/\s+/)[0] ?? cadastro;
  const primeiroInformado = informado.split(/\s+/)[0] ?? informado;
  return cadastro === informado || primeiroCadastro === primeiroInformado;
}

/**
 * Garante sessão e comanda abertas para um cliente já cadastrado na mesa do QR.
 * Reutiliza vínculo/comanda aberta quando existir (idempotente).
 */
export async function entrarComClienteExistente(
  mesa: MesaQr,
  clienteId: string,
): Promise<{ sessaoId: string; comandaId: string }> {
  const sessao = await garantirSessaoAberta(mesa.id, mesa.restaurante_id);

  let comandaId: string | null = null;
  const { data: vincExistente, error: vExistErr } = await supabaseAdmin
    .from("mesa_sessao_clientes")
    .select("comanda_id")
    .eq("sessao_id", sessao.id)
    .eq("cliente_id", clienteId)
    .is("saiu_em", null)
    .maybeSingle();
  if (vExistErr) throw new Error(vExistErr.message);
  if (vincExistente?.comanda_id) {
    const { data: comandaExist, error: cExistErr } = await supabaseAdmin
      .from("comandas")
      .select("id, status")
      .eq("id", vincExistente.comanda_id as string)
      .maybeSingle();
    if (cExistErr) throw new Error(cExistErr.message);
    if (comandaExist && comandaExist.status === "aberta") {
      comandaId = comandaExist.id as string;
    }
  }

  if (!comandaId) {
    comandaId = await criarComandaIndividual(sessao.id, mesa.restaurante_id, clienteId);
  }

  await vincularClienteSessao(sessao.id, clienteId, comandaId);

  await supabaseAdmin
    .from("clientes")
    .update({ ultima_visita: new Date().toISOString() })
    .eq("id", clienteId);

  return { sessaoId: sessao.id, comandaId };
}
