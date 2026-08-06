import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { BannerPublico } from "@/lib/banners.functions";

interface BannersCardapioProps {
  banners: BannerPublico[];
  onCategoria?: (categoriaId: string) => void;
  onProduto?: (produtoId: string) => void;
  className?: string;
}

/** Carrossel compacto de banners exibido no topo do cardápio público. */
export function BannersCardapio({
  banners,
  onCategoria,
  onProduto,
  className,
}: BannersCardapioProps) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const atual = banners[Math.min(indice, banners.length - 1)];
  if (!atual) return null;

  const clicavel = atual.destino_tipo !== "nenhum" && !!atual.destino_valor;

  function handleClick() {
    if (!clicavel || !atual) return;
    const valor = atual.destino_valor!;
    if (atual.destino_tipo === "categoria") onCategoria?.(valor);
    else if (atual.destino_tipo === "produto") onProduto?.(valor);
    else if (atual.destino_tipo === "link") window.open(valor, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border",
          clicavel && "cursor-pointer",
        )}
        onClick={handleClick}
      >
        <img
          src={atual.imagem_url}
          alt={atual.alt_text}
          loading="lazy"
          className="h-28 w-full object-cover sm:h-36"
        />
      </div>
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Ir para o banner ${i + 1}`}
              onClick={() => setIndice(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === indice ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
