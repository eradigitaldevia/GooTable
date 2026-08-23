import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Escopo da tentativa: busca por telefone x confirmação de identidade. */
export type EscopoIdentificacao = "lookup" | "confirmacao";

/** Mensagem única para "não encontrado" e "bloqueado" (resposta uniforme). */
export const IDENTIFICACAO_BLOQUEADA_MENSAGEM =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

/** Janela usada para medir o histórico recente de falhas. */
const JANELA_MINUTOS = 30;

/**
 * Backoff progressivo: quanto mais falhas recentes, maior a espera.
 * Ordenado do mais severo para o mais leve.
 */
const NIVEIS: Array<{ falhas: number; esperaMinutos: number }> = [
  { falhas: 12, esperaMinutos: 120 },
  { falhas: 8, esperaMinutos: 30 },
  { falhas: 5, esperaMinutos: 5 },
  { falhas: 3, esperaMinutos: 1 },
];

export interface BloqueioIdentificacao {
  bloqueado: boolean;
  /** ISO da liberação, quando bloqueado. */
  bloqueadoAte: string | null;
}

export function hashValor(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

/** Mensagem amigável com o tempo restante de espera. */
export function mensagemBloqueio(bloqueadoAte: string | null): string {
  if (!bloqueadoAte) return IDENTIFICACAO_BLOQUEADA_MENSAGEM;
  const restanteMs = new Date(bloqueadoAte).getTime() - Date.now();
  if (restanteMs <= 0) return IDENTIFICACAO_BLOQUEADA_MENSAGEM;
  const minutos = Math.ceil(restanteMs / 60_000);
  return minutos <= 1
    ? "Muitas tentativas. Aguarde 1 minuto e tente novamente."
    : `Muitas tentativas. Aguarde ${minutos} minutos e tente novamente.`;
}

function liberacao(falhas: number, ultimaFalha: string | null): string | null {
  if (!ultimaFalha) return null;
  const nivel = NIVEIS.find((n) => falhas >= n.falhas);
  if (!nivel) return null;
  const ate = new Date(new Date(ultimaFalha).getTime() + nivel.esperaMinutos * 60_000);
  return ate.getTime() > Date.now() ? ate.toISOString() : null;
}

async function avaliarChave(
  filtro: { coluna: "qr_token" | "telefone_hash"; valor: string },
  restauranteId: string,
  escopo: EscopoIdentificacao,
  desde: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("identificacao_tentativas")
    .select("criado_em")
    .eq("restaurante_id", restauranteId)
    .eq(filtro.coluna, filtro.valor)
    .eq("escopo", escopo)
    .eq("sucesso", false)
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) return null;
  const linhas = data ?? [];
  if (linhas.length === 0) return null;
  return liberacao(linhas.length, linhas[0]!.criado_em as string);
}

/**
 * Throttle adaptativo persistido (o runtime é stateless): mede as falhas
 * recentes por mesa (QR) e por telefone, dentro do escopo informado, e aplica
 * um bloqueio temporário crescente.
 */
export async function identificacaoBloqueada(params: {
  restauranteId: string;
  qrToken: string;
  telefone: string;
  escopo: EscopoIdentificacao;
}): Promise<BloqueioIdentificacao> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();
  const telefoneHash = hashValor(params.telefone);

  const [porQr, porTelefone] = await Promise.all([
    avaliarChave(
      { coluna: "qr_token", valor: params.qrToken },
      params.restauranteId,
      params.escopo,
      desde,
    ),
    avaliarChave(
      { coluna: "telefone_hash", valor: telefoneHash },
      params.restauranteId,
      params.escopo,
      desde,
    ),
  ]);

  const candidatos = [porQr, porTelefone].filter((v): v is string => !!v);
  if (candidatos.length === 0) return { bloqueado: false, bloqueadoAte: null };

  const bloqueadoAte = candidatos.sort().at(-1)!;
  return { bloqueado: true, bloqueadoAte };
}

/**
 * Registra a tentativa; falhas também vão para audit_logs (telefone com hash).
 * Um acerto limpa o histórico de falhas daquele telefone no escopo.
 */
export async function registrarTentativaIdentificacao(params: {
  restauranteId: string;
  qrToken: string;
  telefone: string;
  sucesso: boolean;
  escopo: EscopoIdentificacao;
}): Promise<void> {
  const telefoneHash = hashValor(params.telefone);
  await supabaseAdmin.from("identificacao_tentativas").insert({
    restaurante_id: params.restauranteId,
    qr_token: params.qrToken,
    telefone_hash: telefoneHash,
    sucesso: params.sucesso,
    escopo: params.escopo,
  });

  if (params.sucesso) {
    await supabaseAdmin
      .from("identificacao_tentativas")
      .delete()
      .eq("restaurante_id", params.restauranteId)
      .eq("telefone_hash", telefoneHash)
      .eq("escopo", params.escopo)
      .eq("sucesso", false);
    return;
  }

  await supabaseAdmin.from("audit_logs").insert({
    acao: "identificacao_cliente_falha",
    entidade: "clientes",
    metadata: {
      restaurante_id: params.restauranteId,
      qr_token: params.qrToken,
      telefone_hash: telefoneHash,
      escopo: params.escopo,
    },
  });
}
