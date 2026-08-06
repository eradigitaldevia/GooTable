import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Garcom } from "@/lib/garcons.functions";
import { useGerarRelatorioComissoes } from "@/hooks/use-relatorios";
import { exportarRelatorioCSV, gerarRelatorioPDF } from "@/lib/relatorios-export";
import { dataLocal } from "@/lib/data-fuso";

interface Props {
  restauranteId: string;
  garcom: Garcom | null;
  onClose: () => void;
}

export function ExtratoGarcomDialog({ restauranteId, garcom, onClose }: Props) {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const [extInicio, setExtInicio] = useState(dataLocal(primeiroDia));
  const [extFim, setExtFim] = useState(dataLocal(hoje));
  const gerarRelatorio = useGerarRelatorioComissoes();

  const handleExtrato = async (formato: "csv" | "pdf") => {
    if (!garcom) return;
    try {
      const rel = await gerarRelatorio.mutateAsync({
        restauranteId,
        garcomId: garcom.id,
        inicio: `${extInicio}T00:00:00.000Z`,
        fim: `${extFim}T23:59:59.999Z`,
      });
      if (formato === "csv") exportarRelatorioCSV(rel);
      else await gerarRelatorioPDF(rel);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar extrato");
    }
  };

  return (
    <Dialog open={!!garcom} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extrato {garcom ? `— ${garcom.nome}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ext-inicio">De</Label>
              <Input
                id="ext-inicio"
                type="date"
                value={extInicio}
                onChange={(e) => setExtInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ext-fim">Até</Label>
              <Input
                id="ext-fim"
                type="date"
                value={extFim}
                onChange={(e) => setExtFim(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={gerarRelatorio.isPending}
              onClick={() => handleExtrato("csv")}
            >
              Exportar CSV
            </Button>
            <Button
              disabled={gerarRelatorio.isPending}
              onClick={() => handleExtrato("pdf")}
            >
              {gerarRelatorio.isPending ? "Gerando…" : "Gerar PDF"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}