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
import { useCriarMesa } from "@/hooks/use-mesas";

export default function NovaMesaDialogBody({
  restauranteId,
  onClose,
}: {
  restauranteId: string;
  onClose: () => void;
}) {
  const [numero, setNumero] = useState("");
  const criar = useCriarMesa(restauranteId);

  async function save() {
    if (!numero.trim()) {
      toast.error("Informe o número/identificação da mesa");
      return;
    }
    try {
      await criar.mutateAsync({ numero: numero.trim() });
      toast.success("Mesa criada");
      setNumero("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar mesa");
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova mesa</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Número / identificação</Label>
        <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 12 ou Varanda 3" />
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={criar.isPending}>
          {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
