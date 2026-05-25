import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const ProdutoDialogBody = lazy(() => import("./produto-dialog-body"));

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

export function ProdutoDialog({
  restauranteId,
  categorias,
  produto,
  onSaved,
  trigger,
}: {
  restauranteId: string;
  categorias: Categoria[];
  produto?: Produto;
  onSaved: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Produto
          </Button>
        )}
      </DialogTrigger>
      {open && (
        <Suspense fallback={null}>
          <ProdutoDialogBody
            restauranteId={restauranteId}
            categorias={categorias}
            produto={produto}
            onSaved={onSaved}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
