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
  campoAtivo:
    | "social_instagram_ativo"
    | "social_facebook_ativo"
    | "social_youtube_ativo"
    | "social_linkedin_ativo"
    | "social_tiktok_ativo"
    | "social_x_ativo";
  rotulo: string;
  base: string;
  placeholder: string;
  /** Domínios aceitos quando o valor é uma URL completa. */
  dominios: string[];
  /** Prefixo "@" no handle (perfis de usuário). */
  arroba: boolean;
};

export const REDES_SOCIAIS: RedeSocialDef[] = [
  {
    chave: "instagram",
    campo: "social_instagram",
    campoAtivo: "social_instagram_ativo",
    rotulo: "Instagram",
    base: "https://instagram.com/",
    placeholder: "@mesasistema",
    dominios: ["instagram.com"],
    arroba: true,
  },
  {
    chave: "facebook",
    campo: "social_facebook",
    campoAtivo: "social_facebook_ativo",
    rotulo: "Facebook",
    base: "https://facebook.com/",
    placeholder: "mesasistema",
    dominios: ["facebook.com", "fb.com"],
    arroba: false,
  },
  {
    chave: "youtube",
    campo: "social_youtube",
    campoAtivo: "social_youtube_ativo",
    rotulo: "YouTube",
    base: "https://youtube.com/",
    placeholder: "@mesasistema",
    dominios: ["youtube.com", "youtu.be"],
    arroba: true,
  },
  {
    chave: "linkedin",
    campo: "social_linkedin",
    campoAtivo: "social_linkedin_ativo",
    rotulo: "LinkedIn",
    base: "https://linkedin.com/company/",
    placeholder: "mesasistema",
    dominios: ["linkedin.com"],
    arroba: false,
  },
  {
    chave: "tiktok",
    campo: "social_tiktok",
    campoAtivo: "social_tiktok_ativo",
    rotulo: "TikTok",
    base: "https://tiktok.com/",
    placeholder: "@mesasistema",
    dominios: ["tiktok.com"],
    arroba: true,
  },
  {
    chave: "x",
    campo: "social_x",
    campoAtivo: "social_x_ativo",
    rotulo: "X",
    base: "https://x.com/",
    placeholder: "@mesasistema",
    dominios: ["x.com", "twitter.com"],
    arroba: true,
  },
];

export function getRedeSocial(rede: RedeSocial): RedeSocialDef | undefined {
  return REDES_SOCIAIS.find((r) => r.chave === rede);
}

const HANDLE_RE = /^[A-Za-z0-9._-]{1,50}$/;
const HANDLE_LINKEDIN_RE = /^(company\/|in\/|school\/)?[A-Za-z0-9._-]{1,50}$/;

function dominioPermitido(host: string, dominios: string[]): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return dominios.some((d) => h === d || h.endsWith(`.${d}`));
}

export type ResultadoValidacao = { ok: true } | { ok: false; erro: string };

/** Valida um handle ou URL de perfil. Vazio é considerado válido (rede não configurada). */
export function validarValorSocial(
  rede: RedeSocial,
  valor: string | null | undefined,
): ResultadoValidacao {
  const def = getRedeSocial(rede);
  if (!def) return { ok: false, erro: "Rede social desconhecida." };

  const bruto = (valor ?? "").trim();
  if (!bruto) return { ok: true };

  const exemplo = `Informe um link do ${def.rotulo} (${def.dominios[0]}) ou o usuário, ex.: ${def.placeholder}`;

  if (/^[a-z]+:\/\//i.test(bruto) || /^www\./i.test(bruto) || bruto.includes(".com")) {
    if (!/^https?:\/\//i.test(bruto) && !/^www\./i.test(bruto)) {
      return { ok: false, erro: `Use um endereço começando com https://. ${exemplo}` };
    }
    const comEsquema = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;
    let url: URL;
    try {
      url = new URL(comEsquema.replace(/\s+/g, ""));
    } catch {
      return { ok: false, erro: `Endereço inválido. ${exemplo}` };
    }
    if (!dominioPermitido(url.hostname, def.dominios)) {
      return {
        ok: false,
        erro: `O link deve ser do ${def.rotulo} (${def.dominios.join(", ")}).`,
      };
    }
    if (url.pathname.replace(/\/+/g, "") === "") {
      return { ok: false, erro: `Inclua o perfil no link. ${exemplo}` };
    }
    return { ok: true };
  }

  const handle = bruto.replace(/^@+/, "").replace(/^\/+/, "");
  if (!handle) return { ok: false, erro: exemplo };
  const re = rede === "linkedin" ? HANDLE_LINKEDIN_RE : HANDLE_RE;
  if (!re.test(handle)) {
    return {
      ok: false,
      erro: "Use apenas letras, números, ponto, hífen ou sublinhado (até 50 caracteres).",
    };
  }
  return { ok: true };
}

/**
 * Monta a URL do perfil a partir de um handle (`@mesa`, `mesa`) ou de uma URL completa.
 * Devolve `null` quando o valor está vazio ou inválido.
 */
export function montarLinkSocial(
  rede: RedeSocial,
  valor: string | null | undefined,
): string | null {
  const def = getRedeSocial(rede);
  if (!def) return null;

  const bruto = (valor ?? "").trim().replace(/\s+/g, "");
  if (!bruto) return null;
  if (!validarValorSocial(rede, bruto).ok) return null;

  if (/^https?:\/\//i.test(bruto) || /^www\./i.test(bruto)) {
    const comEsquema = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;
    try {
      const url = new URL(comEsquema);
      url.protocol = "https:";
      return url.toString();
    } catch {
      return null;
    }
  }

  const handle = bruto.replace(/^@+/, "").replace(/^\/+/, "");
  if (!handle) return null;

  return `${def.base}${def.arroba ? "@" : ""}${handle}`;
}

