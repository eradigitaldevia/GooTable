import { formatBRL } from "@/lib/cart";

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria_id: string | null;
  disponivel: boolean;
  ordem: number;
}

export function ProdutoCard({
  produto,
  onClick,
  readOnly = false,
}: {
  produto: Produto;
  onClick: () => void;
  readOnly?: boolean;
}) {
  const oculto = readOnly && !produto.disponivel;
  return (
    <button
      onClick={readOnly ? undefined : onClick}
      disabled={readOnly}
      aria-disabled={readOnly}
      className={`relative flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-[var(--shadow-soft)] transition ${
        readOnly ? "cursor-default" : "active:scale-[0.99]"
      } ${oculto ? "opacity-50" : ""}`}
    >
      {oculto && (
        <span className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Oculto
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-tight">{produto.nome}</div>
        {produto.descricao && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{produto.descricao}</p>
        )}
        <div className="mt-2 font-bold text-primary">{formatBRL(Number(produto.preco))}</div>
      </div>
      {produto.imagem_url ? (
        <img src={produto.imagem_url} alt={produto.nome} className="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-xl bg-muted" />
      )}
    </button>
  );
}
