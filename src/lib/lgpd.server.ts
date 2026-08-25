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
