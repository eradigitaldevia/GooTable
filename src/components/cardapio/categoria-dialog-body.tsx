import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCriarCategoria } from "@/hooks/use-cardapio";

export default function CategoriaDialogBody({
  restauranteId,
  onSaved,
  onClose,
}: {
  restauranteId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [nome, setNome] = useState("");
  const criar = useCriarCategoria(restauranteId);

  async function save() {
    if (nome.trim().length < 2) {
      toast.error("Nome muito curto");
      return;
    }
    try {
      await criar.mutateAsync({ nome: nome.trim() });
      toast.success("Categoria criada");
      setNome("");
      onClose();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova categoria</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Entradas" />
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={criar.isPending}>
          {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
