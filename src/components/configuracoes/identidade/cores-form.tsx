import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { foregroundOn, passesAA } from "@/lib/cor-utils";

type Tema = "claro" | "escuro";

export function CoresForm({
  primaria,
  secundaria,
  acento,
  tema,
  onChange,
}: {
  primaria: string;
  secundaria: string;
  acento: string;
  tema: Tema;
  onChange: (patch: {
    cor_primaria?: string;
    cor_secundaria?: string;
    cor_acento?: string;
    tema_cardapio?: Tema;
  }) => void;
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

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoCor
          label="Primária"
          ajuda="Botões, destaques, preço"
          value={primaria}
          onChange={(v) => onChange({ cor_primaria: v })}
        />
        <CampoCor
          label="Secundária"
          ajuda="Cabeçalhos e tons de apoio"
          value={secundaria}
          onChange={(v) => onChange({ cor_secundaria: v })}
        />
        <CampoCor
          label="Acento"
          ajuda="Badges e detalhes"
          value={acento}
          onChange={(v) => onChange({ cor_acento: v })}
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

function CampoCor({
  label,
  ajuda,
  value,
  onChange,
}: {
  label: string;
  ajuda: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-transparent"
          aria-label={`Cor ${label}`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 flex-1 font-mono text-xs uppercase"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{ajuda}</p>
    </div>
  );
}