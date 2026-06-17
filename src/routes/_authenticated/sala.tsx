import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SalaHeader } from "@/components/sala/sala-header";
import { PratosProntosList } from "@/components/sala/pratos-prontos-list";
import { MinhasMesasGrid } from "@/components/sala/minhas-mesas-grid";
import { ChamadosList } from "@/components/sala/chamados-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Play, Square, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  useSalaDados,
  useRealtimeSala,
  useConfirmarEntregaSala,
  useAtenderChamadoSala,
  useAbrirTurno,
  useEncerrarTurno,
} from "@/hooks/use-sala";

export const Route = createFileRoute("/_authenticated/sala")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) throw redirect({ to: "/login" });
    const { data: garcom } = await supabase
      .from("garcons")
      .select("id, nome")
      .eq("user_id", uid)
      .eq("ativo", true)
      .maybeSingle();
    if (!garcom) {
      throw redirect({ to: "/admin" });
    }
    return { garcom };
  },
  component: SalaPage,
});

function SalaPage() {
  const { garcom: garcomCtx } = Route.useRouteContext() as {
    garcom: { id: string; nome: string };
  };
  const { data, isLoading } = useSalaDados();
  const [tab, setTab] = useState<"prontos" | "mesas" | "chamados">("prontos");
  const [pendingPedidoId, setPendingPedidoId] = useState<string | null>(null);
  const [pendingChamadoId, setPendingChamadoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [apenasMinhas, setApenasMinhas] = useState<boolean>(true);

  const restauranteId = data?.garcom.restaurante_id;
  const mesas = data?.mesas ?? [];
  const mesaIds = useMemo(() => mesas.map((m) => m.id), [mesas]);

  useRealtimeSala(restauranteId, mesaIds);

  const confirmar = useConfirmarEntregaSala(restauranteId);
  const atender = useAtenderChamadoSala(restauranteId);
  const abrirTurno = useAbrirTurno();
  const encerrarTurno = useEncerrarTurno();

  const prontosPorMesa = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data?.pedidos_prontos ?? []) {
      m.set(p.mesa_id, (m.get(p.mesa_id) ?? 0) + 1);
    }
    return m;
  }, [data?.pedidos_prontos]);

  const chamadosPorMesa = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data?.chamados_pendentes ?? []) {
      m.set(c.mesa_id, (m.get(c.mesa_id) ?? 0) + 1);
    }
    return m;
  }, [data?.chamados_pendentes]);

  const totalChamados = data?.chamados_pendentes.length ?? 0;
  const totalProntos = data?.pedidos_prontos.length ?? 0;

  const nome = data?.garcom.nome ?? garcomCtx.nome;
  const garcomId = data?.garcom.id ?? garcomCtx.id;
  const turno = data?.turno ?? null;

  const permitirCruzado = data?.permitir_atendimento_cruzado ?? false;
  const temMesasMinhas = useMemo(
    () => mesas.some((m) => m.minha),
    [mesas],
  );
  const mostrarToggleMinhas = permitirCruzado && temMesasMinhas;

  useEffect(() => {
    if (!garcomId || typeof window === "undefined") return;
    const v = window.localStorage.getItem(`sala:apenasMinhas:${garcomId}`);
    if (v != null) setApenasMinhas(v === "1");
  }, [garcomId]);

  const handleToggleApenasMinhas = (v: boolean) => {
    setApenasMinhas(v);
    if (garcomId && typeof window !== "undefined") {
      window.localStorage.setItem(
        `sala:apenasMinhas:${garcomId}`,
        v ? "1" : "0",
      );
    }
  };

  const mesasFiltradas = useMemo(() => {
    let arr = mesas;
    if (mostrarToggleMinhas && apenasMinhas) {
      arr = arr.filter((m) => m.minha);
    }
    const t = busca.trim().toLowerCase();
    if (!t) return arr;
    return arr.filter((m) => m.numero.toLowerCase().includes(t));
  }, [mesas, busca, apenasMinhas, mostrarToggleMinhas]);

  const horaTurno = turno
    ? new Date(turno.iniciado_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SalaHeader
        nome={nome}
        mesas={mesas}
        chamadosPendentes={totalChamados}
        onIrChamados={() => setTab("chamados")}
      />
      <main className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
          {turno ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Turno aberto</span>
                <span className="text-muted-foreground">desde {horaTurno}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={encerrarTurno.isPending}
                onClick={() => {
                  encerrarTurno.mutate(garcomId, {
                    onSuccess: () => toast.success("Turno encerrado"),
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : "Erro"),
                  });
                }}
              >
                <Square className="mr-1 h-3.5 w-3.5" />
                Encerrar turno
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">
                  Inicie o turno para receber comissão dos pedidos
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={abrirTurno.isPending}
                onClick={() => {
                  abrirTurno.mutate(garcomId, {
                    onSuccess: () => toast.success("Turno iniciado"),
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : "Erro"),
                  });
                }}
              >
                <Play className="mr-1 h-3.5 w-3.5" />
                Iniciar turno
              </Button>
            </>
          )}
        </div>
        {isLoading && !data ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prontos">
                Prontos{totalProntos > 0 && ` (${totalProntos})`}
              </TabsTrigger>
              <TabsTrigger value="mesas">
                Mesas{mesas.length > 0 && ` (${mesas.length})`}
              </TabsTrigger>
              <TabsTrigger value="chamados">
                Chamados{totalChamados > 0 && ` (${totalChamados})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="prontos" className="mt-4">
              <PratosProntosList
                pedidos={data?.pedidos_prontos ?? []}
                pendingId={pendingPedidoId}
                onConfirmarEntrega={(id) => {
                  setPendingPedidoId(id);
                  confirmar.mutate(id, {
                    onSettled: () => setPendingPedidoId(null),
                  });
                }}
              />
            </TabsContent>
            <TabsContent value="mesas" className="mt-4">
              {mostrarToggleMinhas && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  <Label
                    htmlFor="toggle-apenas-minhas"
                    className="text-sm font-medium"
                  >
                    Apenas minhas mesas
                  </Label>
                  <Switch
                    id="toggle-apenas-minhas"
                    checked={apenasMinhas}
                    onCheckedChange={handleToggleApenasMinhas}
                  />
                </div>
              )}
              {mesas.length > 6 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    inputMode="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar mesa..."
                    className="pl-9"
                  />
                </div>
              )}
              <MinhasMesasGrid
                mesas={mesasFiltradas}
                prontosPorMesa={prontosPorMesa}
                chamadosPorMesa={chamadosPorMesa}
              />
            </TabsContent>
            <TabsContent value="chamados" className="mt-4">
              <ChamadosList
                chamados={data?.chamados_pendentes ?? []}
                pendingId={pendingChamadoId}
                onAtender={(id) => {
                  setPendingChamadoId(id);
                  atender.mutate(id, {
                    onSettled: () => setPendingChamadoId(null),
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}