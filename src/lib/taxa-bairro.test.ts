import { describe, it, expect } from "vitest";
import { resolverTaxaEntrega, type ConfigTaxaBairro } from "./taxa-bairro";

const base: ConfigTaxaBairro = {
  porBairro: true,
  foraLista: "bloquear",
  taxaPadrao: 8,
  bairros: [
    { nome: "Centro", taxa: 5 },
    { nome: "Jardim América", taxa: 12 },
  ],
};

describe("taxa de entrega por bairro", () => {
  it("bairro cadastrado cobra a própria taxa (ignora acento/maiúsculas)", () => {
    expect(resolverTaxaEntrega("delivery", "jardim amérICA", base)).toEqual({
      ok: true,
      taxa: 12,
      bairroCadastrado: true,
    });
  });

  it("fora da lista com regra bloquear é rejeitado", () => {
    expect(resolverTaxaEntrega("delivery", "Vila Nova", base).ok).toBe(false);
  });

  it("fora da lista com regra taxa padrão cobra a taxa padrão", () => {
    const r = resolverTaxaEntrega("delivery", "Vila Nova", { ...base, foraLista: "taxa_padrao" });
    expect(r).toEqual({ ok: true, taxa: 8, bairroCadastrado: false });
  });

  it("retirada não cobra taxa", () => {
    expect(resolverTaxaEntrega("retirada", "Vila Nova", base)).toEqual({
      ok: true,
      taxa: 0,
      bairroCadastrado: false,
    });
  });

  it("com taxa por bairro desligada, usa a taxa única", () => {
    const r = resolverTaxaEntrega("delivery", "Centro", { ...base, porBairro: false });
    expect(r).toEqual({ ok: true, taxa: 8, bairroCadastrado: false });
  });
});
