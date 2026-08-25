/** Helpers puros para montar o link do CTA "Fale com vendas". */

export const EMAIL_COMERCIAL_FALLBACK = "comercial@mesasistema.com.br";

export const MENSAGEM_VENDAS_PADRAO = "Olá! Quero conhecer o sistema Mesa.";

/** Normaliza o número para o formato aceito pelo wa.me (somente dígitos, com DDI 55). */
export function normalizarWhatsapp(numero: string | null | undefined): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

export type VendasLink = {
  href: string;
  isWhatsapp: boolean;
};

/** Devolve o href do CTA de vendas — WhatsApp quando configurado, senão e-mail. */
export function montarLinkVendas(
  numero: string | null | undefined,
  mensagem?: string | null,
): VendasLink {
  const wa = normalizarWhatsapp(numero);
  if (!wa) {
    return { href: `mailto:${EMAIL_COMERCIAL_FALLBACK}`, isWhatsapp: false };
  }
  const texto = (mensagem ?? "").trim();
  const query = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return { href: `https://wa.me/${wa}${query}`, isWhatsapp: true };
}
