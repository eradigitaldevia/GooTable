export interface CartItem {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string;
  cliente_nome?: string;
  cliente_id?: string;
  imagem_url?: string | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Escopo do carrinho
// ───────────────────────────────────────────────────────────────────────────
// O carrinho original era exclusivo do fluxo de mesa (qrToken). Para suportar
// o módulo de Delivery (cardápio próprio por slug) introduzimos um escopo
// adicional sem quebrar as APIs existentes — todas as funções antigas
// continuam funcionando como wrappers do escopo "mesa".
export type CartScope = "mesa" | "delivery";

const EVENT_NAME: Record<CartScope, string> = {
  mesa: "mesa-cart-change",
  delivery: "delivery-cart-change",
};

const scopedKey = (scope: CartScope, token: string) => `${scope}-cart:${token}`;

const key = (qrToken: string) => scopedKey("mesa", qrToken);

// ───────── API genérica por escopo (nova) ─────────
export function getScopedCart(scope: CartScope, token: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(scopedKey(scope, token));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function setScopedCart(scope: CartScope, token: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedKey(scope, token), JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME[scope], { detail: { token, scope } }),
  );
}

export function addToScopedCart(scope: CartScope, token: string, item: CartItem) {
  const cart = getScopedCart(scope, token);
  cart.push(item);
  setScopedCart(scope, token, cart);
}

export function clearScopedCart(scope: CartScope, token: string) {
  setScopedCart(scope, token, []);
}

export const cartChangeEvent = (scope: CartScope) => EVENT_NAME[scope];

// ───────── Atalhos do escopo "delivery" ─────────
export const getDeliveryCart = (slug: string) => getScopedCart("delivery", slug);
export const setDeliveryCart = (slug: string, items: CartItem[]) =>
  setScopedCart("delivery", slug, items);
export const addToDeliveryCart = (slug: string, item: CartItem) =>
  addToScopedCart("delivery", slug, item);
export const clearDeliveryCart = (slug: string) => clearScopedCart("delivery", slug);

// ───────── API legada (mesa) — mantida 100% compatível ─────────

export function getCart(qrToken: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(qrToken));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function setCart(qrToken: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(qrToken), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("mesa-cart-change", { detail: { qrToken } }));
}

export function addToCart(qrToken: string, item: CartItem) {
  const cart = getCart(qrToken);
  cart.push(item);
  setCart(qrToken, cart);
}

export function clearCart(qrToken: string) {
  setCart(qrToken, []);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.preco * it.quantidade, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.quantidade, 0);
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
