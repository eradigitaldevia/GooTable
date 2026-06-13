import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useGerarRelatorioComissoes } from "@/hooks/use-relatorios";
import { exportarRelatorioCSV, gerarRelatorioPDF } from "@/lib/relatorios-export";

type Canal = "mesa" | "balcao" | "delivery" | "retirada";
const CANAL_OPCOES: { value: Canal; label: string }[] = [
  { value: "mesa", label: "Salão" },
  { value: "balcao", label: "Balcão" },
  { value: "delivery", label: "Delivery" },
  { value: "retirada", label: "Retirada" },
];

export function RelatorioExportarCard({ restauranteId }: { restauranteId: string }) {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const [inicio, setInicio] = useState(primeiroDia.toISOString().slice(0, 10));
  const [fim, setFim] = useState(hoje.toISOString().slice(0, 10));
  const [canais, setCanais] = useState<Canal[]>([]);
  const gerarRelatorio = useGerarRelatorioComissoes();

  const handleExportar = async (formato: "csv" | "pdf") => {
    try {
      const rel = await gerarRelatorio.mutateAsync({
        restauranteId,
        inicio: `${inicio}T00:00:00.000Z`,
        fim: `${fim}T23:59:59.999Z`,
        canais: canais.length > 0 ? canais : undefined,
      });
      if (formato === "csv") exportarRelatorioCSV(rel);
      else await gerarRelatorioPDF(rel);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar relatório");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="rel-inicio" className="text-xs">De</Label>
          <Input
            id="rel-inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div>
          <Label htmlFor="rel-fim" className="text-xs">Até</Label>
          <Input
            id="rel-fim"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div>
          <Label className="text-xs">Canais (vazio = todos)</Label>
          <ToggleGroup
            type="multiple"
            size="sm"
            value={canais}
            onValueChange={(v) => setCanais(v as Canal[])}
            className="justify-start"
          >
            {CANAL_OPCOES.map((c) => (
              <ToggleGroupItem key={c.value} value={c.value} className="text-xs">
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={gerarRelatorio.isPending}
            onClick={() => handleExportar("csv")}
          >
            <Download className="mr-1 h-4 w-4" /> Exportar CSV
          </Button>
          <Button
            size="sm"
            disabled={gerarRelatorio.isPending}
            onClick={() => handleExportar("pdf")}
          >
            <FileText className="mr-1 h-4 w-4" />
            {gerarRelatorio.isPending ? "Gerando…" : "Gerar PDF"}
          </Button>
        </div>
      </div>
    </Card>
  );
}