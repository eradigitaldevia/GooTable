import { TemaCardapioProvider } from "@/components/cliente/tema-cardapio-provider";

/**
 * Amostra estática do tema escolhido — não consulta dados, apenas mostra
 * combinação de cores em alguns elementos típicos do cardápio.
 */
export function PreviewAmostra({
  nome,
  primaria,
  secundaria,
  acento,
  tema,
}: {
  nome: string;
  primaria: string;
  secundaria: string;
  acento: string;
  tema: "claro" | "escuro";
}) {
  return (
    <TemaCardapioProvider
      restaurante={{
        cor_primaria: primaria,
        cor_secundaria: secundaria,
        cor_acento: acento,
        tema_cardapio: tema,
      }}
      className="overflow-hidden rounded-xl border border-border"
    >
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {(nome || "R").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{nome || "Seu restaurante"}</div>
            <div className="text-[11px] opacity-70">Mesa 12</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
            Todos
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
            Entradas
          </span>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
            Promoção
          </span>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Hambúrguer artesanal</div>
              <div className="text-[11px] opacity-70">Pão brioche, blend 180g</div>
            </div>
            <span className="text-sm font-bold text-primary">R$ 39,90</span>
          </div>
          <button
            type="button"
            className="mt-2 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Adicionar
          </button>
        </div>
      </div>
    </TemaCardapioProvider>
  );
}