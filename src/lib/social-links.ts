/** Helpers puros para os perfis de redes sociais da plataforma. */

export type RedeSocial =
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "tiktok"
  | "x";

export type RedeSocialDef = {
  chave: RedeSocial;
  campo:
    | "social_instagram"
    | "social_facebook"
    | "social_youtube"
    | "social_linkedin"
    | "social_tiktok"
    | "social_x";
  rotulo: string;
  base: string;
  placeholder: string;
  /** Prefixo "@" no handle (perfis de usuário). */
  arroba: boolean;
};

export const REDES_SOCIAIS: RedeSocialDef[] = [
  {
    chave: "instagram",
    campo: "social_instagram",
    rotulo: "Instagram",
    base: "https://instagram.com/",
    placeholder: "@mesasistema",
    arroba: true,
  },
  {
    chave: "facebook",
    campo: "social_facebook",
    rotulo: "Facebook",
    base: "https://facebook.com/",
    placeholder: "mesasistema",
    arroba: false,
  },
  {
    chave: "youtube",
    campo: "social_youtube",
    rotulo: "YouTube",
    base: "https://youtube.com/",
    placeholder: "@mesasistema",
    arroba: true,
  },
  {
    chave: "linkedin",
    campo: "social_linkedin",
    rotulo: "LinkedIn",
    base: "https://linkedin.com/company/",
    placeholder: "mesasistema",
    arroba: false,
  },
  {
    chave: "tiktok",
    campo: "social_tiktok",
    rotulo: "TikTok",
    base: "https://tiktok.com/",
    placeholder: "@mesasistema",
    arroba: true,
  },
  {
    chave: "x",
    campo: "social_x",
    rotulo: "X",
    base: "https://x.com/",
    placeholder: "@mesasistema",
    arroba: true,
  },
];

/**
 * Monta a URL do perfil a partir de um handle (`@mesa`, `mesa`) ou de uma URL completa.
 * Devolve `null` quando o valor está vazio ou inválido.
 */
export function montarLinkSocial(
  rede: RedeSocial,
  valor: string | null | undefined,
): string | null {
  const def = REDES_SOCIAIS.find((r) => r.chave === rede);
  if (!def) return null;

  const bruto = (valor ?? "").trim();
  if (!bruto) return null;

  if (/^https?:\/\//i.test(bruto)) {
    return bruto.replace(/\s+/g, "");
  }

  const handle = bruto.replace(/^@+/, "").replace(/^\/+/, "").replace(/\s+/g, "");
  if (!handle) return null;

  return `${def.base}${def.arroba ? "@" : ""}${handle}`;
}
