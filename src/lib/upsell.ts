import type { CartItem } from "@/lib/cart";
import type { CategoriaPublica, ProdutoPublico } from "@/lib/cardapio-publico.functions";

const RE_BEBIDA = /bebida|drink|suco|cerveja|vinho|refri|\bagua\b|água|coquetel|chope/i;
const RE_SOBREMESA = /sobremesa|doce|sorvete|pudim|torta|brigadeiro/i;
const RE_PRATO = /prato|principal|burger|hamburguer|hambúrguer|pizza|massa|carne|frango|peixe|risoto|combo|executivo/i;

export type TipoCategoria = "bebida" | "sobremesa" | "prato" | "outro";

export function classificarCategoria(nome: string | undefined | null): TipoCategoria {
  if (!nome) return "outro";
  if (RE_BEBIDA.test(nome)) return "bebida";
  if (RE_SOBREMESA.test(nome)) return "sobremesa";
  if (RE_PRATO.test(nome)) return "prato";
  return "outro";
}

/**
 * Lógica em 3 camadas:
 * A) Destaques manuais (destaque_upsell = true)
 * B) Contextual: bebida se faltar; sobremesa se houver prato e faltar sobremesa
 * C) Fallback: qualquer outro disponível
 * Dedup e limita a `max` (default 3).
 */
export function sugerirUpsell(
  produtos: ProdutoPublico[],
  categorias: CategoriaPublica[],
  carrinho: CartItem[],
  max = 3,
): ProdutoPublico[] {
  const idsNoCarrinho = new Set(carrinho.map((i) => i.produto_id));
  const candidatos = produtos.filter((p) => p.disponivel && !idsNoCarrinho.has(p.id));

  const catById = new Map(categorias.map((c) => [c.id, c]));
  const tipoDe = (p: ProdutoPublico): TipoCategoria =>
    classificarCategoria(p.categoria_id ? catById.get(p.categoria_id)?.nome : null);

  const tiposNoCarrinho = new Set<TipoCategoria>();
  for (const item of carrinho) {
    const prod = produtos.find((p) => p.id === item.produto_id);
    if (prod) tiposNoCarrinho.add(tipoDe(prod));
  }

  // Camada A — destaques
  const destaques = candidatos
    .filter((p) => p.destaque_upsell)
    .sort((a, b) => {
      const aNovo = tiposNoCarrinho.has(tipoDe(a)) ? 1 : 0;
      const bNovo = tiposNoCarrinho.has(tipoDe(b)) ? 1 : 0;
      if (aNovo !== bNovo) return aNovo - bNovo;
      return Number(a.preco) - Number(b.preco);
    });

  // Camada B — contextual
  const contextuais: ProdutoPublico[] = [];
  if (!tiposNoCarrinho.has("bebida")) {
    const b = candidatos.find((p) => !p.destaque_upsell && tipoDe(p) === "bebida");
    if (b) contextuais.push(b);
  }
  if (tiposNoCarrinho.has("prato") && !tiposNoCarrinho.has("sobremesa")) {
    const s = candidatos.find((p) => !p.destaque_upsell && tipoDe(p) === "sobremesa");
    if (s) contextuais.push(s);
  }

  // Camada C — fallback
  const fallback = candidatos.filter(
    (p) => !p.destaque_upsell && !contextuais.includes(p),
  );

  const seen = new Set<string>();
  const out: ProdutoPublico[] = [];
  for (const p of [...destaques, ...contextuais, ...fallback]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}