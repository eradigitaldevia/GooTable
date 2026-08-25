import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LGPD_VERSAO } from "./lgpd";

/**
 * Registra um aceite dos documentos legais.
 * Nunca lança: falha de registro não deve bloquear o fluxo do usuário.
 */
export async function registrarConsentimentoLgpd(params: {
  escopo: string;
  entidadeTipo: "restaurante" | "cliente";
  entidadeId: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("lgpd_consentimentos").insert({
    escopo: params.escopo,
    entidade_tipo: params.entidadeTipo,
    entidade_id: params.entidadeId,
    versao: LGPD_VERSAO,
  });
  if (error) {
    console.error("[lgpd] falha ao registrar consentimento:", error.message);
  }
}

/**
 * Registra, de forma anônima, a escolha de cookies de um visitante.
 * Nunca lança: falha de registro não deve bloquear a navegação.
 */
export async function registrarConsentimentoCookies(params: {
  visitanteId: string;
  funcionais: boolean;
  analise: boolean;
  origem: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("lgpd_cookies_consentimentos").insert({
    visitante_id: params.visitanteId,
    versao: LGPD_VERSAO,
    essenciais: true,
    funcionais: params.funcionais,
    analise: params.analise,
    origem: params.origem,
  });
  if (error) {
    console.error("[lgpd] falha ao registrar consentimento de cookies:", error.message);
  }
}
