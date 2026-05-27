import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ProdutoDialog } from "./produto-dialog";
import { useAlterarDisponibilidadeProduto, useExcluirProduto } from "@/hooks/use-cardapio";

interface Categoria { id: string; nome: string; ordem: number; }
interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  disponivel: boolean;
  categoria_id: string | null;
  ordem: number;
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
  const alterarDisp = useAlterarDisponibilidadeProduto(restauranteId);
  const excluir = useExcluirProduto(restauranteId);

  async function toggleDisponivel(v: boolean) {
    try {
      await alterarDisp.mutateAsync({ id: produto.id, disponivel: v });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }
  async function remove() {
    if (!confirm(`Excluir "${produto.nome}"?`)) return;
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
            {cat && <span className="text-xs text-muted-foreground">{cat.nome}</span>}
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
            <Button size="icon" variant="ghost" onClick={remove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProdutoCard = memo(ProdutoCardComponent);
