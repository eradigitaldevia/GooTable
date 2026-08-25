import { LGPD_VERSAO } from "./lgpd";

export const COOKIES_STORAGE_KEY = "mesa:cookies:v1";
export const COOKIES_VISITANTE_KEY = "mesa:cookies:visitante";

export interface PreferenciasCookies {
  essenciais: true;
  funcionais: boolean;
  analise: boolean;
  versao: string;
  decididoEm: string;
}

export const CATEGORIAS_COOKIES = [
  {
    chave: "essenciais" as const,
    titulo: "Essenciais",
    descricao:
      "Necessários para o funcionamento do site: sessão, segurança e preferências básicas. Sempre ativos.",
    obrigatoria: true,
  },
  {
    chave: "funcionais" as const,
    titulo: "Funcionais",
    descricao: "Guardam preferências de exibição para melhorar sua experiência.",
    obrigatoria: false,
  },
  {
    chave: "analise" as const,
    titulo: "Análise",
    descricao: "Ajudam a entender, de forma agregada, como o site é utilizado.",
    obrigatoria: false,
  },
];

export function lerPreferenciasCookies(): PreferenciasCookies | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreferenciasCookies>;
    if (parsed.versao !== LGPD_VERSAO) return null;
    return {
      essenciais: true,
      funcionais: Boolean(parsed.funcionais),
      analise: Boolean(parsed.analise),
      versao: LGPD_VERSAO,
      decididoEm: typeof parsed.decididoEm === "string" ? parsed.decididoEm : "",
    };
  } catch {
    return null;
  }
}

export function salvarPreferenciasCookies(input: {
  funcionais: boolean;
  analise: boolean;
}): PreferenciasCookies {
  const prefs: PreferenciasCookies = {
    essenciais: true,
    funcionais: input.funcionais,
    analise: input.analise,
    versao: LGPD_VERSAO,
    decididoEm: new Date().toISOString(),
  };
  try {
    localStorage.setItem(COOKIES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
  return prefs;
}

/** Identificador anônimo do visitante, gerado e persistido no navegador. */
export function obterVisitanteId(): string {
  if (typeof localStorage === "undefined") return crypto.randomUUID();
  try {
    const atual = localStorage.getItem(COOKIES_VISITANTE_KEY);
    if (atual) return atual;
    const novo = crypto.randomUUID();
    localStorage.setItem(COOKIES_VISITANTE_KEY, novo);
    return novo;
  } catch {
    return crypto.randomUUID();
  }
}
