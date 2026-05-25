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

const key = (qrToken: string) => `mesa-cart:${qrToken}`;

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
