import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Mensagem única para "não encontrado" e "bloqueado" (resposta uniforme). */
export const IDENTIFICACAO_BLOQUEADA_MENSAGEM =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

const JANELA_MINUTOS = 10;
const MAX_POR_QR = 5;
const MAX_POR_TELEFONE = 3;

export function hashValor(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

/**
 * Throttle persistido (o runtime é stateless): limita tentativas de
 * identificação por telefone para impedir enumeração de clientes.
 * Retorna `true` quando a tentativa deve ser bloqueada.
 */
export async function identificacaoBloqueada(params: {
  restauranteId: string;
  qrToken: string;
  telefone: string;
}): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();
  const telefoneHash = hashValor(params.telefone);

  const [porQr, porTelefone] = await Promise.all([
    supabaseAdmin
      .from("identificacao_tentativas")
      .select("id", { count: "exact", head: true })
      .eq("restaurante_id", params.restauranteId)
      .eq("qr_token", params.qrToken)
      .eq("sucesso", false)
      .gte("criado_em", desde),
    supabaseAdmin
      .from("identificacao_tentativas")
      .select("id", { count: "exact", head: true })
      .eq("restaurante_id", params.restauranteId)
      .eq("telefone_hash", telefoneHash)
      .eq("sucesso", false)
      .gte("criado_em", desde),
  ]);

  return (porQr.count ?? 0) >= MAX_POR_QR || (porTelefone.count ?? 0) >= MAX_POR_TELEFONE;
}

/** Registra a tentativa; falhas também vão para audit_logs (telefone com hash). */
export async function registrarTentativaIdentificacao(params: {
  restauranteId: string;
  qrToken: string;
  telefone: string;
  sucesso: boolean;
}): Promise<void> {
  const telefoneHash = hashValor(params.telefone);
  await supabaseAdmin.from("identificacao_tentativas").insert({
    restaurante_id: params.restauranteId,
    qr_token: params.qrToken,
    telefone_hash: telefoneHash,
    sucesso: params.sucesso,
  });

  if (!params.sucesso) {
    await supabaseAdmin.from("audit_logs").insert({
      acao: "identificacao_cliente_falha",
      entidade: "clientes",
      metadata: {
        restaurante_id: params.restauranteId,
        qr_token: params.qrToken,
        telefone_hash: telefoneHash,
      },
    });
  }
}
