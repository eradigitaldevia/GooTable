import { describe, it, expect } from "vitest";
import { calcularTaxaDistancia, taxaQuandoFalha, type ConfigTaxaDistancia } from "./taxa-distancia";

const faixas: ConfigTaxaDistancia = {
  modelo: "faixas",
  faixas: [
    { ate_km: 6, taxa: 10 },
    { ate_km: 3, taxa: 6 },
  ],
  baseValor: 0,
  baseKm: 0,
  valorKmExtra: 0,
  raioMaxKm: 8,
};

const baseKm: ConfigTaxaDistancia = {
  ...faixas,
  modelo: "base_km",
  baseValor: 5,
  baseKm: 2,
  valorKmExtra: 2,
};

describe("taxa por distância", () => {
  it("faixa: 3 km exatos cobra a primeira faixa", () => {
    expect(calcularTaxaDistancia(3, faixas)).toEqual({ ok: true, taxa: 6 });
  });
  it("faixa: 3,1 km cobra a segunda faixa", () => {
    expect(calcularTaxaDistancia(3.1, faixas)).toEqual({ ok: true, taxa: 10 });
  });
  it("faixa: além da última faixa bloqueia", () => {
    expect(calcularTaxaDistancia(7, faixas).ok).toBe(false);
  });
  it("acima do raio máximo bloqueia", () => {
    expect(calcularTaxaDistancia(8.5, baseKm)).toEqual({
      ok: false,
      erro: "Endereço fora da área de entrega (máx. 8 km)",
    });
  });
  it("base + km: dentro da base cobra só a base", () => {
    expect(calcularTaxaDistancia(1.5, baseKm)).toEqual({ ok: true, taxa: 5 });
  });
  it("base + km: excedente arredonda para cima ao 0,1 km", () => {
    // 3,42 km → 1,42 extra → 1,5 km × R$2 = R$3 + R$5
    expect(calcularTaxaDistancia(3.42, baseKm)).toEqual({ ok: true, taxa: 8 });
  });
  it("falha: taxa fixa ou bloqueio", () => {
    expect(taxaQuandoFalha("taxa_fixa", 7)).toEqual({ ok: true, taxa: 7 });
    expect(taxaQuandoFalha("bloquear", 7).ok).toBe(false);
  });
});