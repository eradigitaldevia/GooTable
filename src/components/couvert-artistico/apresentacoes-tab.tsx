import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Play, Square, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useApresentacoes,
  useArtistas,
  useAbrirApresentacao,
  useEncerrarApresentacao,
  useAtualizarPesosApresentacao,
} from "@/hooks/use-couvert-artistico";
import type { Apresentacao } from "@/lib/apresentacoes.functions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type LinhaArtista = { artista_id: string; peso: string };

export function ApresentacoesTab({ restauranteId }: { restauranteId: string }) {
  const { data: apresentacoes = [], isLoading } = useApresentacoes(restauranteId);
  const { data: artistas = [] } = useArtistas(restauranteId, true);
  const abrir = useAbrirApresentacao(restauranteId);
  const encerrar = useEncerrarApresentacao(restauranteId);
  const atualizarPesos = useAtualizarPesosApresentacao(restauranteId);

  const [openNova, setOpenNova] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [linhasNova, setLinhasNova] = useState<LinhaArtista[]>([]);

  const [editandoPesos, setEditandoPesos] = useState<Apresentacao | null>(null);
  const [linhasEdit, setLinhasEdit] = useState<LinhaArtista[]>([]);

  const aberta = apresentacoes.find((a) => !a.fim_em) ?? null;
  const encerradas = apresentacoes.filter((a) => a.fim_em);

  function distribuirIgual(linhas: LinhaArtista[]): LinhaArtista[] {
    const n = linhas.length;
    if (n === 0) return linhas;
    const base = Math.floor((100 / n) * 100) / 100;
    const resto = +(100 - base * (n - 1)).toFixed(2);
    return linhas.map((l, i) => ({
      ...l,
      peso: String(i === n - 1 ? resto : base),
    }));
  }

  function abrirNovaDialog() {
    setNomeNova("");
    setLinhasNova(distribuirIgual(artistas.slice(0, 1).map((a) => ({ artista_id: a.id, peso: "100" }))));
    setOpenNova(true);
  }

  function addLinhaNova() {
    const idsUsados = new Set(linhasNova.map((l) => l.artista_id));
    const disp = artistas.find((a) => !idsUsados.has(a.id));
    if (!disp) {
      toast.error("Todos os artistas ativos já foram adicionados.");
      return;
    }
    setLinhasNova((prev) => distribuirIgual([...prev, { artista_id: disp.id, peso: "0" }]));
  }
  function removeLinhaNova(idx: number) {
    setLinhasNova((prev) => distribuirIgual(prev.filter((_, i) => i !== idx)));
  }

  function parsePesos(linhas: LinhaArtista[]) {
    const parsed = linhas.map((l) => ({
      artista_id: l.artista_id,
      peso: Number(l.peso.replace(",", ".")) || 0,
    }));
    const soma = parsed.reduce((a, x) => a + x.peso, 0);
    return { parsed, soma };
  }

  async function submitNova() {
    if (nomeNova.trim().length < 2) {
      toast.error("Informe um nome para a apresentação.");
      return;
    }
    if (linhasNova.length === 0) {
      toast.error("Adicione ao menos um artista.");
      return;
    }
    const { parsed, soma } = parsePesos(linhasNova);
    if (Math.abs(soma - 100) > 0.01) {
      toast.error(`A soma dos pesos deve ser 100% (atual: ${soma.toFixed(2)}%).`);
      return;
    }
    try {
      await abrir.mutateAsync({
        restauranteId,
        nome: nomeNova.trim(),
        artistas: parsed,
      });
      toast.success("Apresentação aberta");
      setOpenNova(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir");
    }
  }

  async function handleEncerrar(ap: Apresentacao) {
    if (!confirm(`Encerrar "${ap.nome}"? Os repasses serão gerados automaticamente.`)) return;
    try {
      await encerrar.mutateAsync({ restauranteId, apresentacaoId: ap.id });
      toast.success("Apresentação encerrada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao encerrar");
    }
  }

  function startEditPesos(ap: Apresentacao) {
    setEditandoPesos(ap);
    setLinhasEdit(ap.artistas.map((a) => ({ artista_id: a.artista_id, peso: String(a.peso) })));
  }
  async function submitEditPesos() {
    if (!editandoPesos) return;
    const { parsed, soma } = parsePesos(linhasEdit);
    if (Math.abs(soma - 100) > 0.01) {
      toast.error(`A soma dos pesos deve ser 100% (atual: ${soma.toFixed(2)}%).`);
      return;
    }
    try {
      await atualizarPesos.mutateAsync({
        restauranteId,
        apresentacaoId: editandoPesos.id,
        artistas: parsed,
      });
      toast.success("Pesos atualizados");
      setEditandoPesos(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  const semArtistas = artistas.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {aberta ? "1 apresentação aberta" : "Nenhuma apresentação aberta"} ·{" "}
          {encerradas.length} encerrada(s)
        </p>
        <Button onClick={abrirNovaDialog} disabled={!!aberta || semArtistas} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Abrir apresentação
        </Button>
      </div>

      {semArtistas && (
        <Card className="border-dashed p-4 text-sm text-muted-foreground">
          Cadastre artistas na aba <strong>Artistas</strong> antes de abrir uma
          apresentação.
        </Card>
      )}

      {aberta && (
        <Card className="border-primary/50 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground">
                  <Play className="mr-1 h-3 w-3" /> Em andamento
                </Badge>
                <h3 className="truncate text-base font-semibold">{aberta.nome}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Iniciada em {formatDate(aberta.inicio_em)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {aberta.artistas.map((a) => (
                  <span key={a.id} className="rounded-full bg-background px-2 py-1">
                    {a.artista_nome} — <strong>{a.peso}%</strong>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm">
                Couvert artístico arrecadado:{" "}
                <strong>{brl(aberta.valor_couvert_total ?? 0)}</strong>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={() => startEditPesos(aberta)}>
                Editar pesos
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleEncerrar(aberta)}
                disabled={encerrar.isPending}
              >
                {encerrar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Square className="mr-2 h-4 w-4" /> Encerrar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Encerradas</h3>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Início</th>
                <th className="px-4 py-2 text-left">Fim</th>
                <th className="px-4 py-2 text-left">Artistas</th>
                <th className="px-4 py-2 text-right">Couvert arrecadado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : encerradas.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem apresentações encerradas.</td></tr>
              ) : encerradas.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{a.nome}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(a.inicio_em)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(a.fim_em)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.artistas.map((x) => `${x.artista_nome} (${x.peso}%)`).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2 text-right">{brl(a.valor_couvert_total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: nova apresentação */}
      <Dialog open={openNova} onOpenChange={setOpenNova}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abrir apresentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome / descrição *</Label>
              <Input
                placeholder="Ex.: Show acústico — Banda X"
                value={nomeNova}
                onChange={(e) => setNomeNova(e.target.value)}
                maxLength={140}
              />
            </div>
            <PesosEditor
              linhas={linhasNova}
              setLinhas={setLinhasNova}
              artistasDisponiveis={artistas}
              onAdd={addLinhaNova}
              onRemove={removeLinhaNova}
              onDistribuirIgual={() => setLinhasNova(distribuirIgual(linhasNova))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNova(false)}>Cancelar</Button>
            <Button onClick={submitNova} disabled={abrir.isPending}>
              {abrir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar pesos */}
      <Dialog open={!!editandoPesos} onOpenChange={(v) => !v && setEditandoPesos(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar pesos da apresentação</DialogTitle>
          </DialogHeader>
          <PesosEditor
            linhas={linhasEdit}
            setLinhas={setLinhasEdit}
            artistasDisponiveis={artistas}
            onAdd={() => {
              const ids = new Set(linhasEdit.map((l) => l.artista_id));
              const disp = artistas.find((a) => !ids.has(a.id));
              if (!disp) return toast.error("Nenhum artista disponível.");
              setLinhasEdit((prev) => [...prev, { artista_id: disp.id, peso: "0" }]);
            }}
            onRemove={(idx) => setLinhasEdit((prev) => prev.filter((_, i) => i !== idx))}
            onDistribuirIgual={() => {
              const n = linhasEdit.length;
              if (n === 0) return;
              const base = Math.floor((100 / n) * 100) / 100;
              const resto = +(100 - base * (n - 1)).toFixed(2);
              setLinhasEdit(
                linhasEdit.map((l, i) => ({
                  ...l,
                  peso: String(i === n - 1 ? resto : base),
                })),
              );
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoPesos(null)}>Cancelar</Button>
            <Button onClick={submitEditPesos} disabled={atualizarPesos.isPending}>
              {atualizarPesos.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PesosEditor({
  linhas,
  setLinhas,
  artistasDisponiveis,
  onAdd,
  onRemove,
  onDistribuirIgual,
}: {
  linhas: LinhaArtista[];
  setLinhas: (v: LinhaArtista[]) => void;
  artistasDisponiveis: { id: string; nome: string }[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onDistribuirIgual: () => void;
}) {
  const soma = useMemo(
    () =>
      linhas.reduce(
        (a, l) => a + (Number(l.peso.replace(",", ".")) || 0),
        0,
      ),
    [linhas],
  );
  const ok = Math.abs(soma - 100) < 0.01;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Artistas e pesos (total = 100%)</Label>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onDistribuirIgual}>
            Distribuir igualmente
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            <Plus className="mr-1 h-3 w-3" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {linhas.map((l, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={l.artista_id}
                onValueChange={(v) => {
                  const copy = [...linhas];
                  copy[idx] = { ...copy[idx], artista_id: v };
                  setLinhas(copy);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {artistasDisponiveis.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Input
                inputMode="decimal"
                value={l.peso}
                onChange={(e) => {
                  const copy = [...linhas];
                  copy[idx] = { ...copy[idx], peso: e.target.value };
                  setLinhas(copy);
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">%</span>
            <Button type="button" size="icon" variant="ghost" onClick={() => onRemove(idx)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className={`text-xs ${ok ? "text-muted-foreground" : "text-destructive"}`}>
        Soma atual: {soma.toFixed(2)}% {ok ? "" : "(deve ser 100%)"}
      </p>
    </div>
  );
}