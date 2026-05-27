import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useGarcons } from "@/hooks/use-garcons";
import {
  useAtualizarMeta,
  useCalcularBonus,
  useCriarMeta,
  useExcluirMeta,
  useGarcomBonus,
  useGarcomMetas,
  usePagarBonus,
  type MetaInput,
} from "@/hooks/use-garcom-bonus";
import type { GarcomMeta } from "@/lib/garcom-bonus.functions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

function MetaForm({
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

function MetasList({ restauranteId }: { restauranteId: string }) {
  const { data: metas = [], isLoading } = useGarcomMetas(restauranteId);
  const criar = useCriarMeta(restauranteId);
  const atualizar = useAtualizarMeta(restauranteId);
  const excluir = useExcluirMeta(restauranteId);
  const [novaOpen, setNovaOpen] = useState(false);
  const [editar, setEditar] = useState<GarcomMeta | null>(null);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-medium">Metas cadastradas</div>
        <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <MetaForm
              restauranteId={restauranteId}
              submitting={criar.isPending}
              onSubmit={async (data) => {
                try {
                  await criar.mutateAsync(data);
                  toast.success("Meta criada");
                  setNovaOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao criar");
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Garçom</th>
            <th className="px-4 py-3">Meta</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3 text-right">Alvo</th>
            <th className="px-4 py-3 text-right">Bônus</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && metas.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                Nenhuma meta cadastrada.
              </td>
            </tr>
          )}
          {metas.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3 font-medium">{m.garcom_nome}</td>
              <td className="px-4 py-3">{m.nome}</td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{m.tipo}</td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{m.periodo}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {m.tipo === "faturamento"
                  ? brl(m.alvo)
                  : m.tipo === "pedidos"
                  ? m.alvo
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {m.bonus_valor > 0 ? brl(m.bonus_valor) : ""}
                {m.bonus_valor > 0 && m.bonus_percentual > 0 ? " + " : ""}
                {m.bonus_percentual > 0 ? `${m.bonus_percentual}%` : ""}
                {m.bonus_valor === 0 && m.bonus_percentual === 0 ? "—" : ""}
              </td>
              <td className="px-4 py-3">
                {m.ativo ? (
                  <Badge variant="outline">Ativa</Badge>
                ) : (
                  <Badge variant="secondary">Inativa</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditar(m)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!confirm(`Excluir meta "${m.nome}"?`)) return;
                    try {
                      await excluir.mutateAsync(m.id);
                      toast.success("Meta excluída");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
                    }
                  }}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
          </DialogHeader>
          {editar && (
            <MetaForm
              restauranteId={restauranteId}
              initial={editar}
              submitting={atualizar.isPending}
              onSubmit={async (data) => {
                try {
                  await atualizar.mutateAsync({ ...data, id: editar.id });
                  toast.success("Meta atualizada");
                  setEditar(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao salvar");
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BonusList({ restauranteId }: { restauranteId: string }) {
  const [status, setStatus] = useState<"pendente" | "pago" | "todos">("pendente");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { data: bonus = [], isLoading } = useGarcomBonus(restauranteId, { status });
  const calcular = useCalcularBonus(restauranteId);
  const pagar = usePagarBonus(restauranteId);

  const total = useMemo(
    () => bonus.reduce((acc, b) => acc + (b.status === "pendente" ? b.valor : 0), 0),
    [bonus],
  );

  const toggleAll = (c: boolean) => {
    if (!c) return setSel(new Set());
    setSel(new Set(bonus.filter((b) => b.status === "pendente").map((b) => b.id)));
  };
  const toggle = (id: string, c: boolean) =>
    setSel((prev) => {
      const n = new Set(prev);
      c ? n.add(id) : n.delete(id);
      return n;
    });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Total pendente: <span className="font-semibold tabular-nums">{brl(total)}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={calcular.isPending}
            onClick={async () => {
              try {
                const r = await calcular.mutateAsync(undefined);
                toast.success(`${r.count} meta(s) processada(s)`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              }
            }}
          >
            <Calculator className="mr-2 h-4 w-4" /> Calcular bônus do período
          </Button>
          <Button
            size="sm"
            disabled={sel.size === 0 || pagar.isPending}
            onClick={async () => {
              try {
                const r = await pagar.mutateAsync(Array.from(sel));
                toast.success(`${r.count} bônus pago(s)`);
                setSel(new Set());
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              }
            }}
          >
            Marcar como pagos
          </Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 w-10">
              {status === "pendente" && (
                <Checkbox
                  checked={bonus.length > 0 && bonus.every((b) => sel.has(b.id))}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
              )}
            </th>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3">Garçom</th>
            <th className="px-4 py-3">Meta</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && bonus.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Nenhum bônus neste filtro.
              </td>
            </tr>
          )}
          {bonus.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3">
                {b.status === "pendente" && (
                  <Checkbox
                    checked={sel.has(b.id)}
                    onCheckedChange={(v) => toggle(b.id, !!v)}
                  />
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(b.periodo_ref).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3 font-medium">{b.garcom_nome}</td>
              <td className="px-4 py-3">
                {b.meta_nome}{" "}
                <Badge variant="outline" className="ml-1 capitalize">
                  {b.meta_tipo}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {brl(b.valor)}
              </td>
              <td className="px-4 py-3">
                {b.status === "pago" ? (
                  <Badge variant="secondary">Pago</Badge>
                ) : (
                  <Badge variant="outline">Pendente</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function MetasBonusPanel({ restauranteId }: { restauranteId: string }) {
  return (
    <div className="space-y-4">
      <MetasList restauranteId={restauranteId} />
      <BonusList restauranteId={restauranteId} />
    </div>
  );
}