import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizarBairro, type BairroTaxa } from "@/lib/taxa-bairro";

const OUTRO = "__outro__";
const brl = (v: number) =>
  v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Grátis";

export function BairroSelect({
  value,
  onChange,
  bairros,
  permitirOutro,
}: {
  value: string;
  onChange: (v: string) => void;
  bairros: BairroTaxa[];
  permitirOutro: boolean;
}) {
  const achado = bairros.find((b) => normalizarBairro(b.nome) === normalizarBairro(value));
  const [outroEscolhido, setOutro] = useState(!!value.trim() && !achado);
  // Bairro preenchido externamente (ex.: CEP) e fora da lista conta como "outro".
  const outro = outroEscolhido || (!!value.trim() && !achado);
  const selecionado = achado ? achado.nome : outro && permitirOutro ? OUTRO : "";

  return (
    <div className="space-y-2">
      <Label htmlFor="end-bai">Bairro</Label>
      <Select
        value={selecionado}
        onValueChange={(v) => {
          if (v === OUTRO) {
            setOutro(true);
            onChange("");
          } else {
            setOutro(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger id="end-bai">
          <SelectValue placeholder="Selecione o bairro" />
        </SelectTrigger>
        <SelectContent>
          {bairros.map((b) => (
            <SelectItem key={b.nome} value={b.nome}>
              {b.nome} — {brl(b.taxa)}
            </SelectItem>
          ))}
          {permitirOutro && <SelectItem value={OUTRO}>Outro bairro</SelectItem>}
        </SelectContent>
      </Select>
      {!achado && value.trim() && !permitirOutro && (
        <p className="text-xs text-muted-foreground">Bairro informado: {value}</p>
      )}
      {outro && permitirOutro && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite o nome do bairro"
          maxLength={80}
        />
      )}
    </div>
  );
}
