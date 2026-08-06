import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { useCardapio } from "@/hooks/use-cardapio";
import {
  useAtualizarBanner,
  useBanners,
  useCriarBanner,
  useExcluirBanner,
} from "@/hooks/use-banners";
import { BannerDialogBody, type BannerFormValues } from "./banner-dialog-body";
import type { Banner } from "@/lib/banners.functions";
import type { Restaurante } from "@/lib/restaurante.functions";

const EXIBIR_LABEL: Record<Banner["exibir_em"], string> = {
  ambos: "Mesa e delivery",
  mesa: "Somente mesa",
  delivery: "Somente delivery",
};

function periodoLabel(b: Banner) {
  const f = (v: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : null);
  const i = f(b.vigencia_inicio);
  const fim = f(b.vigencia_fim);
  if (!i && !fim) return "Sem período definido";
  if (i && fim) return `${i} até ${fim}`;
  return i ? `A partir de ${i}` : `Até ${fim}`;
}

export function BannersPanel({ restaurante }: { restaurante: Restaurante }) {
  const { data: banners, isLoading } = useBanners(restaurante.id);
  const { data: cardapio } = useCardapio(restaurante.id);
  const criar = useCriarBanner(restaurante.id);
  const atualizar = useAtualizarBanner(restaurante.id);
  const excluir = useExcluirBanner(restaurante.id);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [excluindo, setExcluindo] = useState<Banner | null>(null);

  const lista = banners ?? [];
  const ativos = lista.filter((b) => b.ativo).length;

  async function salvar(values: BannerFormValues) {
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, banner: values });
      } else {
        await criar.mutateAsync(values);
      }
      toast.success("Banner salvo");
      setDialogAberto(false);
      setEditando(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar banner");
    }
  }

  async function alternarAtivo(b: Banner, ativo: boolean) {
    try {
      await atualizar.mutateAsync({ id: b.id, banner: { ativo } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar banner");
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success("Banner excluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir banner");
    }
    setExcluindo(null);
  }

  if (isLoading) return <CardsGridSkeleton count={3} className="grid gap-4" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Banners exibidos no topo do cardápio digital. Até 3 ativos por vez ({ativos}/3).
          </p>
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setDialogAberto(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo banner
        </Button>
      </div>

      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum banner cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center"
            >
              <img
                src={b.imagem_url}
                alt={b.alt_text}
                className="h-20 w-full rounded-xl object-cover sm:w-48"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">{b.alt_text || "Sem descrição"}</p>
                <p className="text-xs text-muted-foreground">{periodoLabel(b)}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{EXIBIR_LABEL[b.exibir_em]}</Badge>
                  <Badge variant="outline">Ordem {b.ordem}</Badge>
                  {b.destino_tipo !== "nenhum" && (
                    <Badge variant="outline">Clique: {b.destino_tipo}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={b.ativo} onCheckedChange={(v) => alternarAtivo(b, v)} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditando(b);
                    setDialogAberto(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setExcluindo(b)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogAberto}
        onOpenChange={(o) => {
          setDialogAberto(o);
          if (!o) setEditando(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar banner" : "Novo banner"}</DialogTitle>
            <DialogDescription>
              O banner aparece no topo do cardápio, acima da lista de produtos.
            </DialogDescription>
          </DialogHeader>
          <BannerDialogBody
            key={editando?.id ?? "novo"}
            restauranteId={restaurante.id}
            banner={editando}
            categorias={cardapio?.categorias ?? []}
            produtos={cardapio?.produtos ?? []}
            salvando={criar.isPending || atualizar.isPending}
            onSalvar={salvar}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
            <AlertDialogDescription>
              O banner deixará de ser exibido no cardápio. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
