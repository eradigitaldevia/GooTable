import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { cartCount, cartTotal, formatBRL, getCart } from "@/lib/cart";

/**
 * Pílula flutuante do carrinho. Visível em qualquer tela do cliente
 * (cardápio, status, conta, minha conta) sempre que houver itens.
 */
export function CarrinhoPersistente({ qrToken }: { qrToken: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => getCart(qrToken));

  useEffect(() => {
    setItems(getCart(qrToken));
    const handler = () => setItems(getCart(qrToken));
    window.addEventListener("mesa-cart-change", handler);
    return () => window.removeEventListener("mesa-cart-change", handler);
  }, [qrToken]);

  const count = cartCount(items);
  if (count <= 0) return null;
  const total = cartTotal(items);

  return (
    <button
      onClick={() => navigate({ to: "/m/$qrToken/carrinho", params: { qrToken } })}
      className="fixed left-1/2 bottom-6 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-xl transition hover:scale-[1.02] active:scale-[0.98]"
      aria-label={`Ver carrinho (${count} ${count === 1 ? "item" : "itens"})`}
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" />
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold text-foreground">
          {count}
        </span>
      </div>
      <span className="text-sm font-semibold">Ver pedido</span>
      <span className="text-sm font-bold tabular-nums">{formatBRL(total)}</span>
    </button>
  );
}