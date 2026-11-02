/** Regras puras de taxa de entrega por bairro (usadas no servidor e na UI). */

export type BairroForaLista = "bloquear" | "taxa_padrao";

export interface BairroTaxa {
  nome: string;
  taxa: number;
}

export interface ConfigTaxaBairro {
  porBairro: boolean;
  foraLista: BairroForaLista;
  taxaPadrao: number;
  bairros: BairroTaxa[];
}

export function normalizarBairro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type ResultadoTaxa =
  | { ok: true; taxa: number; bairroCadastrado: boolean }
  | { ok: false; erro: string };

export const MSG_BAIRRO_NAO_ATENDIDO = "Não entregamos neste bairro";

export function resolverTaxaEntrega(
  modo: "delivery" | "retirada",
  bairro: string | null | undefined,
  cfg: ConfigTaxaBairro,
): ResultadoTaxa {
  if (modo === "retirada") return { ok: true, taxa: 0, bairroCadastrado: false };
  if (!cfg.porBairro) return { ok: true, taxa: cfg.taxaPadrao, bairroCadastrado: false };
  const alvo = normalizarBairro(bairro ?? "");
  const achado = alvo ? cfg.bairros.find((b) => normalizarBairro(b.nome) === alvo) : undefined;
  if (achado) return { ok: true, taxa: achado.taxa, bairroCadastrado: true };
  if (cfg.foraLista === "taxa_padrao") {
    return { ok: true, taxa: cfg.taxaPadrao, bairroCadastrado: false };
  }
  return { ok: false, erro: MSG_BAIRRO_NAO_ATENDIDO };
}
