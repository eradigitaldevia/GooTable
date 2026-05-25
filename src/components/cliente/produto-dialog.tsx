import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Minus } from "lucide-react";
import { formatBRL, type CartItem } from "@/lib/cart";

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

export function ProdutoDialog({
  produto,
  onClose,
  onAdd,
}: {
  produto: Produto | null;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (produto) {
      setQtd(1);
      setObs("");
      setNome("");
    }
  }, [produto]);

  if (!produto) return null;

  return (
    <Dialog open={!!produto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {produto.imagem_url && (
          <img src={produto.imagem_url} alt={produto.nome} className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" />
        )}
        <div className="px-5 pt-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{produto.nome}</DialogTitle>
          </DialogHeader>
          {produto.descricao && (
            <p className="mt-2 text-sm text-muted-foreground">{produto.descricao}</p>
          )}
          <div className="mt-2 text-lg font-bold text-primary">{formatBRL(Number(produto.preco))}</div>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: sem cebola" rows={2} />
            </div>
            <div>
              <Label htmlFor="nome">Seu nome (para dividir a conta)</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center gap-3 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 rounded-full border p-1">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => setQtd(Math.max(1, qtd - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-semibold">{qtd}</span>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => setQtd(qtd + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="h-11 flex-1 rounded-full"
            onClick={() =>
              onAdd({
                produto_id: produto.id,
                nome: produto.nome,
                preco: Number(produto.preco),
                quantidade: qtd,
                observacao: obs.trim() || undefined,
                cliente_nome: nome.trim() || undefined,
                imagem_url: produto.imagem_url,
              })
            }
          >
            Adicionar · {formatBRL(Number(produto.preco) * qtd)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
