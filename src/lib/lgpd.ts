/** Versão vigente dos documentos legais (Termos de Uso e Política de Privacidade). */
export const LGPD_VERSAO = "v1.0";

/** E-mail de contato do encarregado (DPO). Substituir antes da operação comercial. */
export const LGPD_EMAIL_DPO = "[EMAIL DPO]";

/** Razão social do controlador. Substituir antes da operação comercial. */
export const LGPD_RAZAO_SOCIAL = "[RAZÃO SOCIAL]";

/** CNPJ do controlador. Substituir antes da operação comercial. */
export const LGPD_CNPJ = "[CNPJ]";

/** Prazo de resposta às solicitações de titulares, em dias. */
export const LGPD_PRAZO_RESPOSTA_DIAS = 15;

export const LGPD_TIPOS_SOLICITACAO = [
  { valor: "consulta", rotulo: "Consultar meus dados" },
  { valor: "exclusao", rotulo: "Excluir meus dados" },
  { valor: "retificacao", rotulo: "Corrigir meus dados" },
  { valor: "oposicao", rotulo: "Opor-me ao tratamento" },
] as const;
