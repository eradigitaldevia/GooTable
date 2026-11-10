/** Regras puras de taxa de entrega por distância (usadas no servidor e na UI). */

export type ModeloKm = "faixas" | "base_km";
export type FalhaDistancia = "taxa_fixa" | "bloquear";

export interface FaixaKm {
  ate_km: number;
  taxa: number;
}

export interface ConfigTaxaDistancia {
  modelo: ModeloKm;
  faixas: FaixaKm[];
  baseValor: number;
  baseKm: number;
  valorKmExtra: number;
  raioMaxKm: number | null;
}

export type ResultadoTaxaDistancia =
  | { ok: true; taxa: number }
  | { ok: false; erro: string };

export const msgForaDoRaio = (raio: number) =>
  `Endereço fora da área de entrega (máx. ${raio.toLocaleString("pt-BR")} km)`;

const arred2 = (v: number) => Math.round(v * 100) / 100;

export function calcularTaxaDistancia(
  distanciaKm: number,
  cfg: ConfigTaxaDistancia,
): ResultadoTaxaDistancia {
  if (!Number.isFinite(distanciaKm) || distanciaKm < 0) {
    return { ok: false, erro: "Distância inválida" };
  }
  if (cfg.raioMaxKm != null && cfg.raioMaxKm > 0 && distanciaKm > cfg.raioMaxKm) {
    return { ok: false, erro: msgForaDoRaio(cfg.raioMaxKm) };
  }
  if (cfg.modelo === "faixas") {
    const ordenadas = [...cfg.faixas].sort((a, b) => a.ate_km - b.ate_km);
    const faixa = ordenadas.find((f) => distanciaKm <= f.ate_km);
    if (!faixa) {
      const max = ordenadas.length ? ordenadas[ordenadas.length - 1].ate_km : 0;
      return { ok: false, erro: msgForaDoRaio(max) };
    }
    return { ok: true, taxa: arred2(faixa.taxa) };
  }
  const excedente = Math.max(0, distanciaKm - cfg.baseKm);
  // arredonda o excedente para cima ao 0,1 km
  const kmExtra = Math.ceil(Math.round(excedente * 1000) / 100) / 10;
  return { ok: true, taxa: arred2(cfg.baseValor + kmExtra * cfg.valorKmExtra) };
}

/** Aplica a política de falha quando a distância não pôde ser calculada. */
export function taxaQuandoFalha(
  falha: FalhaDistancia,
  taxaFixa: number,
): ResultadoTaxaDistancia {
  if (falha === "taxa_fixa") return { ok: true, taxa: taxaFixa };
  return { ok: false, erro: "Não foi possível calcular a entrega para este endereço" };
}