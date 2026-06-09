import type { CartItem } from "@/lib/cart";

/**
 * Estimativa simples de tempo de preparo a partir dos itens.
 * Cozinha (15 min) e bar (5 min) preparam em paralelo — usamos o maior.
 */
const RX_BAR = /\b(água|agua|suco|cerveja|drink|refri|vinho|café|cafe|chopp|coquetel|chá|cha)\b/i;

export function estimarTempoPreparoMin(items: { nome: string }[]): number {
  if (items.length === 0) return 0;
  let temCozinha = false;
  let temBar = false;
  for (const it of items) {
    if (RX_BAR.test(it.nome)) temBar = true;
    else temCozinha = true;
  }
  if (temCozinha) return 15;
  if (temBar) return 5;
  return 10;
}

export function estimarTempoCart(items: CartItem[]): number {
  return estimarTempoPreparoMin(items);
}