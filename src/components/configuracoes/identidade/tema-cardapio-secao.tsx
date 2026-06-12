import { Label } from "@/components/ui/label";
import { AlertTriangle, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { foregroundOn, passesAA } from "@/lib/cor-utils";
import { MiniPrevia } from "./mini-previa";

type Tema = "claro" | "escuro";

export function TemaCardapioSecao({
  primaria,
  secundaria,
  acento,
  tema,
  nome,
  onChange,
}: {
  primaria: string;
  secundaria: string;
  acento: string;
  tema: Tema;
  nome: string;
  onChange: (patch: { tema_cardapio?: Tema }) => void;
}) {
  const bgRef = tema === "escuro" ? "#18181b" : "#fafafa";
  const avisos: string[] = [];
  if (!passesAA(foregroundOn(primaria), primaria)) {
    avisos.push("Cor primária com contraste fraco — texto sobre ela pode ficar pouco legível.");
  }
  if (!passesAA(primaria, bgRef)) {
    avisos.push("Cor primária pode ficar com pouco contraste sobre o fundo do tema escolhido.");
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Tema do cardápio</Label>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => onChange({ tema_cardapio: "claro" })}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              tema === "claro"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sun className="h-4 w-4" /> Claro
          </button>
          <button
            type="button"
            onClick={() => onChange({ tema_cardapio: "escuro" })}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              tema === "escuro"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Moon className="h-4 w-4" /> Escuro
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Swatch label="Primária" cor={primaria} />
        <Swatch label="Secundária" cor={secundaria} />
        <Swatch label="Acento" cor={acento} />
      </div>

      <div>
        <Label className="mb-2 block">Prévia</Label>
        <MiniPrevia
          primaria={primaria}
          secundaria={secundaria}
          acento={acento}
          tema={tema}
          nome={nome}
        />
      </div>

      {avisos.length > 0 && (
        <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <ul className="space-y-1">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Swatch({ label, cor }: { label: string; cor: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
      <span
        className="h-10 w-10 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: cor }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="font-mono text-[11px] uppercase text-muted-foreground">
          {cor}
        </div>
      </div>
    </div>
  );
}