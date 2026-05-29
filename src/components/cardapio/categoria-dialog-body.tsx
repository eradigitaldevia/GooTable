import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [destino, setDestino] = useState<"cozinha" | "bar">("cozinha");
  const criar = useCriarCategoria(restauranteId);

  async function save() {
    if (nome.trim().length < 2) {
      toast.error("Nome muito curto");
      return;
    }
    try {
      await criar.mutateAsync({ nome: nome.trim(), destino });
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
      <div className="space-y-2">
        <Label>Destino padrão</Label>
        <Select value={destino} onValueChange={(v) => setDestino(v as "cozinha" | "bar")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cozinha">Cozinha</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Os produtos dessa categoria vão para esse display por padrão.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={criar.isPending}>
          {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
