import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Image as ImageIcon, Percent } from "lucide-react";
import { toast } from "sonner";
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
import { ProdutoDialog } from "./produto-dialog";
import { useAlterarDisponibilidadeProduto, useExcluirProduto } from "@/hooks/use-cardapio";

interface Categoria { id: string; nome: string; ordem: number; destino: "cozinha" | "bar"; }
interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  disponivel: boolean;
  categoria_id: string | null;
  ordem: number;
  percentual_comissao: number | null;
  comissao_aplicavel: boolean;
  destino_override: "cozinha" | "bar" | null;
}

function ProdutoCardComponent({
  produto,
  categorias,
  restauranteId,
  onChanged,
}: {
  produto: Produto;
  categorias: Categoria[];
  restauranteId: string;
  onChanged: () => void;
}) {
  const cat = categorias.find((c) => c.id === produto.categoria_id);
  const destino = produto.destino_override ?? cat?.destino ?? "cozinha";
  const alterarDisp = useAlterarDisponibilidadeProduto(restauranteId);
  const excluir = useExcluirProduto(restauranteId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function toggleDisponivel(v: boolean) {
    try {
      await alterarDisp.mutateAsync({ id: produto.id, disponivel: v });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }
  async function remove() {
    try {
      await excluir.mutateAsync({ id: produto.id });
      toast.success("Produto excluído");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[4/3] bg-muted">
        {produto.imagem_url ? (
          <img src={produto.imagem_url} alt={produto.nome} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {!produto.disponivel && (
          <div className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-1 text-xs font-medium text-background">
            Indisponível
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{produto.nome}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {cat ? (
                <span className="text-xs text-muted-foreground">{cat.nome}</span>
              ) : (
                <span className="text-xs italic text-muted-foreground">Sem categoria</span>
              )}
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase">{destino}</Badge>
              {produto.percentual_comissao != null && (
                <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px]" title="Comissão customizada">
                  <Percent className="h-2.5 w-2.5" /> {produto.percentual_comissao}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right font-bold text-primary">
            {Number(produto.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
        {produto.descricao && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{produto.descricao}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={produto.disponivel} onCheckedChange={toggleDisponivel} />
            Disponível
          </label>
          <div className="flex gap-1">
            <ProdutoDialog
              restauranteId={restauranteId}
              categorias={categorias}
              produto={produto}
              onSaved={onChanged}
              trigger={
                <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
              }
            />
            <Button size="icon" variant="ghost" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto "{produto.nome}" será removido do cardápio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const ProdutoCard = memo(ProdutoCardComponent);
