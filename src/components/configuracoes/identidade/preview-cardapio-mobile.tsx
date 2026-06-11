import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCardapio } from "@/hooks/use-cardapio";
import { CategoriaTabs } from "@/components/cliente/categoria-tabs";
import { ProdutosListaCategorizada } from "@/components/cliente/produtos-lista-categorizada";
import { TemaCardapioProvider } from "@/components/cliente/tema-cardapio-provider";

/**
 * Prévia mobile (390px) do cardápio com override de tema ao vivo.
 * Usado pelo drawer da aba Identidade — não compartilha estado com
 * a rota /admin/cardapio-preview.
 */
export function PreviewCardapioMobile({
  restauranteId,
  nome,
  logoUrl,
  cor_primaria,
  cor_secundaria,
  cor_acento,
  tema_cardapio,
}: {
  restauranteId: string;
  nome: string;
  logoUrl: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_acento: string;
  tema_cardapio: "claro" | "escuro";
}) {
  const { data, isLoading } = useCardapio(restauranteId);
  const [busca, setBusca] = useState("");
  const [catAtiva, setCatAtiva] = useState<string | "todas">("todas");

  const categorias = data?.categorias ?? [];
  const produtosTodos = data?.produtos ?? [];

  const produtosBase = useMemo(
    () => produtosTodos.filter((p) => p.disponivel),
    [produtosTodos],
  );

  const produtosFiltrados = useMemo(() => {
    return produtosBase.filter((p) => {
      if (catAtiva !== "todas" && p.categoria_id !== catAtiva) return false;
      if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [produtosBase, busca, catAtiva]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, typeof produtosFiltrados>();
    for (const p of produtosFiltrados) {
      const cid = p.categoria_id ?? "sem";
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(p);
    }
    return map;
  }, [produtosFiltrados]);

  return (
    <div className="flex h-full w-full justify-center bg-muted/30 p-3 sm:p-4">
      <div
        className="h-full w-full overflow-hidden rounded-3xl border bg-background shadow-xl"
        style={{ maxWidth: "390px" }}
      >
        <TemaCardapioProvider
          restaurante={{ cor_primaria, cor_secundaria, cor_acento, tema_cardapio }}
          className="h-full overflow-y-auto"
        >
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3">
              {logoUrl ? (
                <img src={logoUrl} alt={nome} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {(nome || "R").charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold leading-tight">{nome || "Seu restaurante"}</h2>
                <p className="text-xs text-muted-foreground">Pré-visualização</p>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar no cardápio…"
                  className="h-11 rounded-full pl-9"
                />
              </div>
              <CategoriaTabs categorias={categorias} ativa={catAtiva} onChange={setCatAtiva} />
            </div>
          </header>

          <main className="px-4 py-4">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (
              <ProdutosListaCategorizada
                produtosFiltrados={produtosFiltrados}
                porCategoria={porCategoria}
                categorias={categorias}
                onSelect={() => {}}
                readOnly
              />
            )}
          </main>
        </TemaCardapioProvider>
      </div>
    </div>
  );
}