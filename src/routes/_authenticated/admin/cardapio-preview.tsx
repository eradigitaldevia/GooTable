import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Smartphone, Tablet, Monitor, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useCardapio } from "@/hooks/use-cardapio";
import { CategoriaTabs } from "@/components/cliente/categoria-tabs";
import { ProdutosListaCategorizada } from "@/components/cliente/produtos-lista-categorizada";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/cardapio-preview")({
  component: CardapioPreview,
});

type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORT_WIDTH: Record<Viewport, number | null> = {
  mobile: 390,
  tablet: 768,
  desktop: null,
};

function CardapioPreview() {
  const { user } = useAuth();
  const { data: restaurante, isLoading: carregandoRest } = useMeuRestaurante(user?.id);
  const { data, isLoading } = useCardapio(restaurante?.id);
  const queryClient = useQueryClient();

  const [viewport, setViewport] = useState<Viewport>("mobile");
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [busca, setBusca] = useState("");
  const [catAtiva, setCatAtiva] = useState<string | "todas">("todas");

  const categorias = data?.categorias ?? [];
  const produtosTodos = data?.produtos ?? [];

  const produtosBase = useMemo(
    () => (mostrarOcultos ? produtosTodos : produtosTodos.filter((p) => p.disponivel)),
    [produtosTodos, mostrarOcultos]
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

  const handleRefresh = () => {
    if (restaurante?.id) {
      queryClient.invalidateQueries({ queryKey: ["cardapio", restaurante.id] });
    }
  };

  if (carregandoRest || isLoading || !restaurante) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const width = VIEWPORT_WIDTH[viewport];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Eye className="h-7 w-7 text-primary" /> Prévia do cardápio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja exatamente como seu cardápio aparece para o cliente.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3">
        <div className="flex items-center gap-1 rounded-xl border bg-background p-1">
          <ViewportButton active={viewport === "mobile"} onClick={() => setViewport("mobile")} icon={Smartphone} label="Mobile" />
          <ViewportButton active={viewport === "tablet"} onClick={() => setViewport("tablet")} icon={Tablet} label="Tablet" />
          <ViewportButton active={viewport === "desktop"} onClick={() => setViewport("desktop")} icon={Monitor} label="Desktop" />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="ocultos" checked={mostrarOcultos} onCheckedChange={setMostrarOcultos} />
          <Label htmlFor="ocultos" className="cursor-pointer text-sm">
            Mostrar itens ocultos do cliente
          </Label>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {width ? <span className="hidden sm:inline">{width}px</span> : <span className="hidden sm:inline">100%</span>}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className={cn(
            "w-full overflow-hidden rounded-3xl border bg-background shadow-xl",
            "lg:transition-all lg:duration-200"
          )}
          style={
            width
              ? { width: "100%", maxWidth: `${width}px`, height: "min(844px, 80vh)" }
              : { width: "100%", height: "min(844px, 80vh)" }
          }
        >
          <div className="h-full overflow-y-auto bg-background">
            <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
              <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
                {restaurante.logo_url ? (
                  <img
                    src={restaurante.logo_url}
                    alt={restaurante.nome}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    {restaurante.nome.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold leading-tight">{restaurante.nome}</h2>
                  <p className="text-xs text-muted-foreground">Pré-visualização</p>
                </div>
              </div>
              <div className="mx-auto max-w-2xl px-4 pb-3">
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

            <main className="mx-auto max-w-2xl px-4 py-4">
              <ProdutosListaCategorizada
                produtosFiltrados={produtosFiltrados}
                porCategoria={porCategoria}
                categorias={categorias}
                onSelect={() => {}}
                readOnly
              />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewportButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Smartphone;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
