import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaletaPicker } from "./paleta-picker";
import { gerarPaletas } from "@/lib/paleta-generator";
import { isValidHex } from "@/lib/cor-utils";
import type { PaletaPreset } from "./paleta-presets";

export function PaletaGerador({
  corPrimariaAtual,
  corSecundariaAtual,
  corAcentoAtual,
  temaAtual,
  onSelect,
}: {
  corPrimariaAtual: string;
  corSecundariaAtual: string;
  corAcentoAtual: string;
  temaAtual: "claro" | "escuro";
  onSelect: (p: PaletaPreset) => void;
}) {
  const [cor, setCor] = useState(corPrimariaAtual);
  const valida = isValidHex(cor);
  const paletas = useMemo(() => (valida ? gerarPaletas(cor) : []), [cor, valida]);

  const selecionadaId =
    paletas.find(
      (p) =>
        p.cor_primaria.toLowerCase() === corPrimariaAtual.toLowerCase() &&
        p.cor_secundaria.toLowerCase() === corSecundariaAtual.toLowerCase() &&
        p.cor_acento.toLowerCase() === corAcentoAtual.toLowerCase() &&
        p.tema === temaAtual,
    )?.id ?? null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Cor da sua marca</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={valida ? cor : "#000000"}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded-md border border-border bg-transparent"
            aria-label="Cor primária da marca"
          />
          <Input
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 flex-1 font-mono text-xs uppercase"
            placeholder="#c2410c"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Informe a cor principal da sua marca e escolha um dos esquemas gerados abaixo.
        </p>
      </div>

      {valida ? (
        <PaletaPicker
          selecionadaId={selecionadaId}
          onSelect={onSelect}
          paletas={paletas}
        />
      ) : (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Digite uma cor válida em hexadecimal (ex.: #c2410c).
        </p>
      )}
    </div>
  );
}