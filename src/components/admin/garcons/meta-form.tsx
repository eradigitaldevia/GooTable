import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useGarcons } from "@/hooks/use-garcons";
import type { MetaInput } from "@/hooks/use-garcom-bonus";
import type { GarcomMeta } from "@/lib/garcom-bonus.functions";

const TIPOS: Array<{ value: MetaInput["tipo"]; label: string }> = [
  { value: "faturamento", label: "Faturamento" },
  { value: "pedidos", label: "Nº de pedidos" },
  { value: "horario", label: "Horário (% sobre comissão)" },
];

const PERIODOS: Array<{ value: MetaInput["periodo"]; label: string }> = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

const DIAS = [
  { v: 0, l: "Dom" },
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

export function MetaForm({
  restauranteId,
  initial,
  onSubmit,
  submitting,
}: {
  restauranteId: string;
  initial?: GarcomMeta;
  onSubmit: (data: MetaInput) => void;
  submitting?: boolean;
}) {
  const { data: garcons = [] } = useGarcons(restauranteId, true);
  const [garcomId, setGarcomId] = useState(initial?.garcom_id ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [tipo, setTipo] = useState<MetaInput["tipo"]>(initial?.tipo ?? "faturamento");
  const [periodo, setPeriodo] = useState<MetaInput["periodo"]>(initial?.periodo ?? "mensal");
  const [alvo, setAlvo] = useState(String(initial?.alvo ?? 0));
  const [bonusValor, setBonusValor] = useState(String(initial?.bonus_valor ?? 0));
  const [bonusPct, setBonusPct] = useState(String(initial?.bonus_percentual ?? 0));
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const regrasInit = (initial?.regras_json ?? {}) as {
    hora_inicio?: number;
    hora_fim?: number;
    dias_semana?: number[];
  };
  const [horaIni, setHoraIni] = useState(String(regrasInit.hora_inicio ?? 18));
  const [horaFim, setHoraFim] = useState(String(regrasInit.hora_fim ?? 23));
  const [dias, setDias] = useState<number[]>(regrasInit.dias_semana ?? []);

  const toggleDia = (d: number) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!garcomId) {
          toast.error("Selecione um garçom");
          return;
        }
        const regras =
          tipo === "horario"
            ? {
                hora_inicio: Number(horaIni),
                hora_fim: Number(horaFim),
                ...(dias.length > 0 ? { dias_semana: dias } : {}),
              }
            : undefined;
        onSubmit({
          garcomId,
          nome: nome.trim() || "Meta",
          tipo,
          periodo,
          alvo: Number(alvo) || 0,
          bonusValor: Number(bonusValor) || 0,
          bonusPercentual: Number(bonusPct) || 0,
          regras,
          ativo,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Garçom</Label>
          <Select value={garcomId} onValueChange={setGarcomId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {garcons.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Nome da meta</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Meta mensal" />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as MetaInput["tipo"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Período</Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as MetaInput["periodo"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {tipo !== "horario" && (
          <div className="col-span-2">
            <Label>{tipo === "faturamento" ? "Alvo (R$)" : "Alvo (pedidos)"}</Label>
            <Input
              type="number"
              step="0.01"
              value={alvo}
              onChange={(e) => setAlvo(e.target.value)}
            />
          </div>
        )}
        <div>
          <Label>Bônus fixo (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={bonusValor}
            onChange={(e) => setBonusValor(e.target.value)}
          />
        </div>
        <div>
          <Label>Bônus % {tipo === "horario" ? "(sobre comissão)" : "(sobre faturamento)"}</Label>
          <Input
            type="number"
            step="0.01"
            value={bonusPct}
            onChange={(e) => setBonusPct(e.target.value)}
          />
        </div>
        {tipo === "horario" && (
          <>
            <div>
              <Label>Hora início (0-23)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={horaIni}
                onChange={(e) => setHoraIni(e.target.value)}
              />
            </div>
            <div>
              <Label>Hora fim (1-24)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label>Dias da semana (vazio = todos)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIAS.map((d) => (
                  <label
                    key={d.v}
                    className="flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-sm"
                  >
                    <Checkbox
                      checked={dias.includes(d.v)}
                      onCheckedChange={() => toggleDia(d.v)}
                    />
                    <span>{d.l}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="col-span-2 flex items-center justify-between rounded-md border border-border p-3">
          <Label>Ativa</Label>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}