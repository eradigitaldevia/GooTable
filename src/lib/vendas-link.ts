/** Helpers puros para montar o link do CTA "Fale com vendas". */

export const MENSAGEM_VENDAS_PADRAO = "Olá! Quero conhecer o sistema GooTable.";

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

const WHATSAPP_DOMAINS = ["wa.me", "api.whatsapp.com", "chat.whatsapp.com"];

function isWhatsappUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return WHATSAPP_DOMAINS.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Devolve o href do CTA de vendas — link tem prioridade, depois número, senão null. */
export function montarLinkVendas(
  numero: string | null | undefined,
  link: string | null | undefined,
  mensagem?: string | null,
): VendasLink | null {
  const texto = (mensagem ?? "").trim();

  const linkTrim = (link ?? "").trim();
  if (linkTrim) {
    if (isWhatsappUrl(linkTrim)) {
      const url = new URL(linkTrim);
      if (texto && !url.searchParams.has("text")) {
        url.searchParams.set("text", texto);
      }
      return { href: url.toString(), isWhatsapp: true };
    }
    return null;
  }

  const wa = normalizarWhatsapp(numero);
  if (!wa) return null;
  const query = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return { href: `https://wa.me/${wa}${query}`, isWhatsapp: true };
}
