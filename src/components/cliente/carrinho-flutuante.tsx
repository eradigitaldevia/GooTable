import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CarrinhoFlutuante({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto max-w-2xl">
        <Button
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-semibold"
          onClick={onClick}
        >
          <ShoppingBag className="mr-2 h-5 w-5" />
          Ver carrinho ({count} {count === 1 ? "item" : "itens"})
        </Button>
      </div>
    </div>
  );
}
