import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { HorarioDia, HorarioFuncionamento } from "@/lib/configuracoes.functions";

const DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export function diasPadrao(): HorarioFuncionamento {
  return DIAS.map((_, i) => ({
    dia: i,
    aberto: false,
    turnos: [],
  }));
}

export function horarioPadrao(): HorarioFuncionamento {
  return DIAS.map((_, i) => ({
    dia: i,
    aberto: true,
    turnos: [{ inicio: "11:00", fim: "23:00" }],
  }));
}

export function normalizarHorario(h: HorarioFuncionamento): HorarioFuncionamento {
  const base = diasPadrao();
  for (const d of h) {
    if (d.dia >= 0 && d.dia <= 6) {
      base[d.dia] = {
        dia: d.dia,
        aberto: !!d.aberto,
        turnos: Array.isArray(d.turnos) ? d.turnos.slice(0, 2) : [],
      };
    }
  }
  return base;
}

export function HorarioFuncionamentoForm({
  horario,
  onChangeHorario,
}: {
  horario: HorarioFuncionamento;
  onChangeHorario: (h: HorarioFuncionamento) => void;
}) {
  const dias = normalizarHorario(horario);
  const nenhumDiaAberto = !dias.some((d) => d.aberto && d.turnos.length > 0);

  function updateDia(idx: number, patch: Partial<HorarioDia>) {
    const next = dias.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChangeHorario(next);
  }

  function updateTurno(diaIdx: number, turnoIdx: number, field: "inicio" | "fim", value: string) {
    const dia = dias[diaIdx];
    const turnos = dia.turnos.map((t, i) => (i === turnoIdx ? { ...t, [field]: value } : t));
    updateDia(diaIdx, { turnos });
  }

  function addTurno(diaIdx: number) {
    const dia = dias[diaIdx];
    if (dia.turnos.length >= 2) return;
    const novoTurno = dia.turnos.length === 0
      ? { inicio: "11:00", fim: "14:00" }
      : { inicio: "18:00", fim: "23:00" };
    updateDia(diaIdx, { aberto: true, turnos: [...dia.turnos, novoTurno] });
  }

  function removeTurno(diaIdx: number, turnoIdx: number) {
    const dia = dias[diaIdx];
    const turnos = dia.turnos.filter((_, i) => i !== turnoIdx);
    updateDia(diaIdx, { turnos, aberto: turnos.length > 0 ? dia.aberto : false });
  }

  function aplicarATodos() {
    const ref = dias.find((d) => d.aberto && d.turnos.length > 0);
    if (!ref) return;
    const next = dias.map((d) => ({
      ...d,
      aberto: true,
      turnos: ref.turnos.map((t) => ({ ...t })),
    }));
    onChangeHorario(next);
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <header className="min-w-0">
        <h2 className="text-base font-semibold">Horário de funcionamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O delivery aceita pedidos apenas nos dias e horários definidos abaixo.
          Fora do horário, o cardápio fica somente leitura.
        </p>
      </header>

      {nenhumDiaAberto && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          Nenhum dia configurado — o delivery não aceitará pedidos.
        </div>
      )}

      {(
        <>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={aplicarATodos}>
              Aplicar a todos os dias
            </Button>
          </div>
          <ul className="space-y-2">
            {dias.map((d, idx) => (
              <li
                key={d.dia}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={d.aberto}
                      onCheckedChange={(v) => {
                        if (v && d.turnos.length === 0) {
                          updateDia(idx, { aberto: true, turnos: [{ inicio: "11:00", fim: "23:00" }] });
                        } else {
                          updateDia(idx, { aberto: v });
                        }
                      }}
                      aria-label={`Aberto ${DIAS[d.dia]}`}
                    />
                    <span className="text-sm font-medium">{DIAS[d.dia]}</span>
                  </div>
                  {!d.aberto && (
                    <span className="text-xs text-muted-foreground">Fechado</span>
                  )}
                </div>

                {d.aberto && (
                  <div className="space-y-2 pl-12">
                    {d.turnos.map((t, ti) => (
                      <div key={ti} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={t.inicio}
                          onChange={(e) => updateTurno(idx, ti, "inicio", e.target.value)}
                          className="h-9 w-28"
                        />
                        <span className="text-xs text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={t.fim}
                          onChange={(e) => updateTurno(idx, ti, "fim", e.target.value)}
                          className="h-9 w-28"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeTurno(idx, ti)}
                          aria-label="Remover turno"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {d.turnos.length < 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTurno(idx)}
                        className="gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {d.turnos.length === 0 ? "Definir turno" : "Adicionar 2º turno"}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Suporta até 2 turnos por dia (ex.: almoço e jantar). Horários que
            cruzam meia-noite são aceitos (ex.: 18:00 às 02:00). Fuso:
            America/Sao_Paulo.
          </p>
        </>
      )}
    </section>
  );
}