import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useCardapio } from "@/hooks/use-cardapio";
import { salvarDestinosPreparoFn, listarCardapioFn } from "@/lib/cardapio.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeaderSkeleton } from "@/components/admin/skeletons/page-header-skeleton";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";
import { ChefHat, Wine, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/destinos-preparo")({
  component: DestinosPreparoPage,
});

type CatDestino = "cozinha" | "bar";
type ProdDestino = "cozinha" | "bar" | null;

function DestinoBadge({ destino }: { destino: "cozinha" | "bar" }) {
  if (destino === "bar") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Wine className="h-3 w-3" /> Bar
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <ChefHat className="h-3 w-3" /> Cozinha
    </Badge>
  );
}

function DestinosPreparoPage() {
  const { user } = useAuth();
  const { data: restaurante, isLoading: carregandoRest } = useMeuRestaurante(user?.id);
  const { data, isLoading } = useCardapio(restaurante?.id);

  const [catMap, setCatMap] = useState<Record<string, CatDestino>>({});
  const [prodMap, setProdMap] = useState<Record<string, ProdDestino>>({});

  useEffect(() => {
    if (!data) return;
    setCatMap(Object.fromEntries(data.categorias.map((c) => [c.id, c.destino])));
    setProdMap(Object.fromEntries(data.produtos.map((p) => [p.id, p.destino_override])));
  }, [data]);

  const qc = useQueryClient();
  const fn = useServerFn(salvarDestinosPreparoFn);
  const salvar = useMutation({
    mutationFn: (payload: {
      categorias: Array<{ id: string; destino: CatDestino }>;
      produtos: Array<{ id: string; destino_override: ProdDestino }>;
    }) =>
      fn({
        data: {
          restauranteId: restaurante!.id,
          categorias: payload.categorias,
          produtos: payload.produtos,
        },
      }),
    onSuccess: () => {
      toast.success("Destinos atualizados");
      if (restaurante) qc.invalidateQueries({ queryKey: ["cardapio", restaurante.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const dirty = useMemo(() => {
    if (!data) return { categorias: [], produtos: [] };
    const cats = data.categorias
      .filter((c) => catMap[c.id] && catMap[c.id] !== c.destino)
      .map((c) => ({ id: c.id, destino: catMap[c.id]! }));
    const prods = data.produtos
      .filter((p) => prodMap[p.id] !== undefined && prodMap[p.id] !== p.destino_override)
      .map((p) => ({ id: p.id, destino_override: prodMap[p.id] }));
    return { categorias: cats, produtos: prods };
  }, [data, catMap, prodMap]);

  const total = dirty.categorias.length + dirty.produtos.length;

  if (carregandoRest || !restaurante || isLoading) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton withActions />
        <CardsGridSkeleton count={4} className="grid gap-4" />
      </div>
    );
  }

  const categorias = data?.categorias ?? [];
  const produtos = data?.produtos ?? [];
  const categoriasById = new Map(categorias.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Destinos de preparo</h1>
          <p className="text-sm text-muted-foreground">
            Defina para onde cada item é enviado: Cozinha ou Bar. Produtos podem
            herdar a categoria ou sobrescrever individualmente.
          </p>
        </div>
        <Button
          onClick={() => salvar.mutate(dirty)}
          disabled={total === 0 || salvar.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          Salvar {total > 0 ? `(${total})` : ""}
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Destino padrão</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.nome}</td>
                  <td className="px-4 py-2">
                    <Select
                      value={catMap[c.id] ?? c.destino}
                      onValueChange={(v) =>
                        setCatMap((m) => ({ ...m, [c.id]: v as CatDestino }))
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cozinha">Cozinha</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Produtos</h2>
        <p className="text-xs text-muted-foreground">
          "Herdar" usa o destino da categoria do produto.
        </p>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Destino efetivo</th>
                <th className="px-4 py-2 font-medium">Destino do produto</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const cat = p.categoria_id ? categoriasById.get(p.categoria_id) : undefined;
                const catDestino = cat ? (catMap[cat.id] ?? cat.destino) : "cozinha";
                const override = prodMap[p.id] ?? p.destino_override;
                const efetivo = override ?? catDestino;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">{p.nome}</td>
                    <td className="px-4 py-2 text-muted-foreground">{cat?.nome ?? "—"}</td>
                    <td className="px-4 py-2">
                      <DestinoBadge destino={efetivo} />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={override ?? "herdar"}
                        onValueChange={(v) =>
                          setProdMap((m) => ({
                            ...m,
                            [p.id]: v === "herdar" ? null : (v as CatDestino),
                          }))
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="herdar">Herdar da categoria</SelectItem>
                          <SelectItem value="cozinha">Cozinha</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
              {produtos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// keep loader import to avoid tree-shake warning
void listarCardapioFn;