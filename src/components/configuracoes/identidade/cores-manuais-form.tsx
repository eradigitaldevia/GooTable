import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidHex } from "@/lib/cor-utils";

export function CoresManuaisForm({
  primaria,
  secundaria,
  acento,
  onChange,
}: {
  primaria: string;
  secundaria: string;
  acento: string;
  onChange: (patch: {
    cor_primaria?: string;
    cor_secundaria?: string;
    cor_acento?: string;
  }) => void;
}) {
  return (
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
  const [rascunho, setRascunho] = useState(value);

  useEffect(() => {
    setRascunho(value);
  }, [value]);

  function commitTexto() {
    const v = rascunho.trim();
    if (v.toLowerCase() === value.toLowerCase()) return;
    if (isValidHex(v)) {
      onChange(v);
    } else {
      setRascunho(value);
      toast.error("Cor inválida. Use o formato #RRGGBB (ex.: #c2410c).");
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            setRascunho(e.target.value);
            onChange(e.target.value);
          }}
          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-transparent"
          aria-label={`Cor ${label}`}
        />
        <Input
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={commitTexto}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTexto();
            }
          }}
          className="h-10 flex-1 font-mono text-xs uppercase"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{ajuda}</p>
    </div>
  );
}