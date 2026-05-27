import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import {
  useAtenderChamado,
  useAtualizarTipoChamado,
  useChamados,
  useCriarTipoChamado,
  useExcluirTipoChamado,
  useMetricasChamados,
  useRealtimeChamados,
  useTiposChamado,
} from "@/hooks/use-chamados";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TipoChamado } from "@/lib/chamados.functions";
import { EmptyState } from "@/components/ui/empty-state";

const ChamadosBarChart = lazy(
  () => import("@/components/admin/chamados-bar-chart"),
);

export const Route = createFileRoute("/_authenticated/admin/chamados")({
  component: ChamadosAdmin,
});

const ICONES = [
  { value: "bell", label: "Sino" },
  { value: "receipt", label: "Conta" },
  { value: "coffee", label: "Bebida" },
  { value: "hand", label: "Mão" },
];

function formatDuracao(seg: number): string {
  if (!seg || seg < 0) return "—";
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}m ${s}s`;
}

function tempoEspera(criadoEm: string): string {
  const seg = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 1000);
  return formatDuracao(seg);
}

function ChamadosAdmin() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  useRealtimeChamados(restaurante?.id);

  const { data: pendentes, isLoading: loadPend } = useChamados(restaurante?.id, true);
  const { data: historico, isLoading: loadHist } = useChamados(restaurante?.id, false);
  const { data: tipos, isLoading: loadTipos } = useTiposChamado(restaurante?.id);
  const { data: metricas } = useMetricasChamados(restaurante?.id);

  const atender = useAtenderChamado(restaurante?.id);
  const criarTipo = useCriarTipoChamado(restaurante?.id);
  const atualizarTipo = useAtualizarTipoChamado(restaurante?.id);
  const excluirTipo = useExcluirTipoChamado(restaurante?.id);

  const [tipoOpen, setTipoOpen] = useState(false);
  const [editando, setEditando] = useState<TipoChamado | null>(null);
  const [form, setForm] = useState({ nome: "", icone: "bell", ativo: true });

  const abrirNovoTipo = () => {
    setEditando(null);
    setForm({ nome: "", icone: "bell", ativo: true });
    setTipoOpen(true);
  };
  const abrirEditarTipo = (t: TipoChamado) => {
    setEditando(t);
    setForm({ nome: t.nome, icone: t.icone, ativo: t.ativo });
    setTipoOpen(true);
  };
  const salvarTipo = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    const input = { nome: form.nome.trim(), icone: form.icone, ativo: form.ativo };
    const handlers = {
      onSuccess: () => {
        toast.success("Salvo");
        setTipoOpen(false);
      },
      onError: (e: unknown) => toast.error((e as Error)?.message ?? "Falha"),
    };
    if (editando) {
      atualizarTipo.mutate({ tipoId: editando.id, input }, handlers);
    } else {
      criarTipo.mutate(input, handlers);
    }
  };
  const removerTipo = (t: TipoChamado) => {
    if (!confirm(`Excluir tipo "${t.nome}"?`)) return;
    excluirTipo.mutate(t.id, {
      onSuccess: () => toast.success("Excluído"),
      onError: (e: unknown) => toast.error((e as Error)?.message ?? "Falha"),
    });
  };

  const handleAtender = (id: string) => {
    atender.mutate(id, {
      onSuccess: () => toast.success("Marcado como atendido"),
      onError: (e: unknown) => toast.error((e as Error)?.message ?? "Falha"),
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Chamados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie as solicitações dos clientes em tempo real.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
              <div className="text-2xl font-bold">{metricas?.pendentes ?? 0}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Atendidos hoje</div>
              <div className="text-2xl font-bold">{metricas?.atendidos_hoje ?? 0}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tempo médio</div>
              <div className="text-2xl font-bold">
                {formatDuracao(metricas?.tempo_medio_segundos ?? 0)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">Distribuição por hora — hoje</h2>
        <div className="h-64">
          <Suspense fallback={null}>
            <ChamadosBarChart data={metricas?.por_hora ?? []} />
          </Suspense>
        </div>
      </Card>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes
            {pendentes?.length ? (
              <Badge variant="destructive" className="ml-2">
                {pendentes.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          {loadPend ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : !pendentes?.length ? (
            <EmptyState description="Nenhum chamado pendente." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendentes.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">
                        Mesa {c.mesa_numero}
                      </div>
                      <div className="mt-1 text-lg font-semibold">{c.tipo_nome}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Esperando há {tempoEspera(c.criado_em)}
                      </div>
                    </div>
                    <Bell className="h-5 w-5 text-amber-600" />
                  </div>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => handleAtender(c.id)}
                    disabled={atender.isPending}
                  >
                    {atender.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Atendido
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          {loadHist ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : !historico?.length ? (
            <EmptyState description="Nenhum chamado." />
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Mesa</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3 font-semibold">{c.mesa_numero}</td>
                      <td className="px-4 py-3">{c.tipo_nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.criado_em).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {c.status === "pendente" ? (
                          <Badge variant="secondary">Pendente</Badge>
                        ) : c.status === "atendido" ? (
                          <Badge>Atendido</Badge>
                        ) : (
                          <Badge variant="outline">Cancelado</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.tempo_atendimento_segundos != null
                          ? formatDuracao(c.tempo_atendimento_segundos)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Tipos de chamado</h3>
              <p className="text-xs text-muted-foreground">
                Aparecem para o cliente no cardápio.
              </p>
            </div>
            <Button onClick={abrirNovoTipo}>
              <Plus className="h-4 w-4" /> Novo tipo
            </Button>
          </div>

          {loadTipos ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : !tipos?.length ? (
            <EmptyState description="Nenhum tipo cadastrado." className="p-6" />
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Ícone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{t.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.icone}</td>
                      <td className="px-4 py-3">
                        {t.ativo ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => abrirEditarTipo(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removerTipo(t)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={tipoOpen} onOpenChange={setTipoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar tipo" : "Novo tipo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Chamar garçom"
              />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <Select
                value={form.icone}
                onValueChange={(v) => setForm({ ...form, icone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICONES.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTipoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarTipo} disabled={criarTipo.isPending || atualizarTipo.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
