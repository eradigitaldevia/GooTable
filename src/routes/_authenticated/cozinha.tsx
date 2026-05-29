import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, ChefHat } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useTick } from "@/hooks/use-tick";
import { queryKeys } from "@/lib/query-keys";
import { usePedidosDoDia, useAtualizarStatusDestino } from "@/hooks/use-pedidos";
import { useMarcarItemUnidades } from "@/hooks/use-kds-item";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { useGarcomLookup } from "@/hooks/use-garcom-lookup";

import { KdsHeader } from "@/components/cozinha/kds-header";
import { KdsCard } from "@/components/cozinha/kds-card";
import { KdsConnectionBanner } from "@/components/cozinha/kds-connection-banner";

export const Route = createFileRoute("/_authenticated/cozinha")({
  component: CozinhaKDS,
});

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

interface Pedido {
  id: string;
  status: StatusPedido;
  total: number;
  observacao: string | null;
  criado_em: string;
  mesa_id: string;
  restaurante_id: string;
  comanda_id: string | null;
  garcom_id?: string | null;
}
interface Item {
  id: string;
  pedido_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
  status: "pendente" | "em_preparo" | "pronto";
  quantidade_pronta: number;
}
interface Mesa { id: string; numero: string; }

function CozinhaKDS() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: restaurante, isLoading: loadingRest } = useMeuRestaurante(user?.id);
  const restauranteId = restaurante?.id ?? null;

  const [somLigado, setSomLigado] = useState(true);
  const somRef = useRef(somLigado);
  useEffect(() => { somRef.current = somLigado; }, [somLigado]);

  // Re-render timers a cada 30s
  useTick(30_000);

  const atualizarDestinoMut = useAtualizarStatusDestino(restauranteId ?? undefined);
  const marcarItemMut = useMarcarItemUnidades(restauranteId ?? undefined);

  const { nomeDoPedido } = useGarcomLookup(restauranteId ?? undefined);

  // Ref mutável usada pelos callbacks de realtime (setado abaixo, após os dados chegarem).
  const mesasRef = useRef<Map<string, Mesa>>(new Map());

  // Realtime via hook reutilizável com banner de conexão.
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleInvalidate = useCallback(() => {
    if (!restauranteId) return;
    if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
    invalidateTimeoutRef.current = setTimeout(() => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
      invalidateTimeoutRef.current = null;
    }, 1000);
  }, [qc, restauranteId]);
  useEffect(() => () => {
    if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
  }, []);

  const setupChannel = useCallback(
    (channel: import("@supabase/supabase-js").RealtimeChannel) =>
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedidos", filter: `restaurante_id=eq.${restauranteId}` },
          (payload) => {
            scheduleInvalidate();
            if (payload.eventType === "INSERT") {
              const novo = payload.new as Pedido;
              toast.success(`Novo pedido — Mesa ${mesasRef.current.get(novo.mesa_id)?.numero ?? "?"}`);
              if (somRef.current) {
                try {
                  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                  const ctx = new Ctx();
                  const o = ctx.createOscillator();
                  const g = ctx.createGain();
                  o.connect(g); g.connect(ctx.destination);
                  o.frequency.value = 880;
                  g.gain.setValueAtTime(0.18, ctx.currentTime);
                  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                  o.start();
                  o.stop(ctx.currentTime + 0.5);
                } catch { /* ignore */ }
              }
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedido_itens" },
          () => scheduleInvalidate(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedido_destino_status" },
          () => scheduleInvalidate(),
        ),
    [restauranteId, scheduleInvalidate],
  );

  const onReconnect = useCallback(() => {
    if (restauranteId) {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
    }
  }, [qc, restauranteId]);

  const { status: rtStatus, reconnect: rtReconnect } = useRealtimeStatus({
    channelName: `kds-${restauranteId ?? "none"}`,
    enabled: !!restauranteId,
    setup: setupChannel,
    onReconnect,
  });

  // Polling de fallback enquanto realtime não está conectado.
  const { data, isLoading } = usePedidosDoDia(restauranteId ?? undefined, {
    refetchInterval: rtStatus === "connected" ? false : 15000,
  });

  const pedidos = (data?.pedidos ?? []) as Pedido[];
  const itensRaw = (data?.itens ?? []) as (Item & { destino?: "cozinha" | "bar" })[];
  // Apenas itens destinados à Cozinha
  const itens = itensRaw.filter((it) => (it.destino ?? "cozinha") === "cozinha") as Item[];
  const pedidosComCozinha = new Set(itens.map((it) => it.pedido_id));

  type DestStatus = { pedido_id: string; destino: "cozinha" | "bar"; status: StatusPedido };
  const destinoStatusList = (data?.destinoStatus ?? []) as DestStatus[];
  const cozinhaStatusMap = useMemo(() => {
    const m = new Map<string, StatusPedido>();
    for (const d of destinoStatusList) {
      if (d.destino === "cozinha") m.set(d.pedido_id, d.status);
    }
    return m;
  }, [destinoStatusList]);

  const mesas = useMemo(() => {
    const m = new Map<string, Mesa>();
    for (const x of (data?.mesas ?? []) as Mesa[]) m.set(x.id, x);
    return m;
  }, [data?.mesas]);
  useEffect(() => { mesasRef.current = mesas; }, [mesas]);

  const itensPorPedido = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of itens) {
      if (!m.has(it.pedido_id)) m.set(it.pedido_id, []);
      m.get(it.pedido_id)!.push(it);
    }
    return m;
  }, [itens]);

  // Beep distinto na queda (transição para "disconnected").
  const prevStatusRef = useRef<typeof rtStatus>("connecting");
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = rtStatus;
    if (rtStatus !== "disconnected" || prev === "disconnected") return;
    if (!somRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 220;
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      o.start();
      o.stop(ctx.currentTime + 0.8);
    } catch { /* ignore */ }
  }, [rtStatus]);

  const ativos = pedidos.filter(
    (p) =>
      p.status !== "cancelado" &&
      p.status !== "entregue" &&
      pedidosComCozinha.has(p.id) &&
      (cozinhaStatusMap.get(p.id) ?? "recebido") !== "pronto",
  );
  const recebidos = ativos.filter(
    (p) => (cozinhaStatusMap.get(p.id) ?? "recebido") === "recebido",
  );
  const emPreparo = ativos.filter(
    (p) => (cozinhaStatusMap.get(p.id) ?? "recebido") === "em_preparo",
  );

  const algumAtrasado = ativos.some(
    (p) => (Date.now() - new Date(p.criado_em).getTime()) / 60000 >= 15,
  );

  const avancar = async (p: Pedido) => {
    const atual = cozinhaStatusMap.get(p.id) ?? "recebido";
    const next: "em_preparo" | "pronto" = atual === "recebido" ? "em_preparo" : "pronto";
    try {
      await atualizarDestinoMut.mutateAsync({
        pedidoId: p.id,
        destino: "cozinha",
        status: next,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar pedido");
    }
  };

  const marcarItem = async (itemId: string, quantidadePronta: number) => {
    try {
      await marcarItemMut.mutateAsync({ itemId, quantidadePronta });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar item");
    }
  };
  const itemPendingId = marcarItemMut.isPending
    ? (marcarItemMut.variables?.itemId ?? null)
    : null;

  if (loadingRest || !restauranteId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <KdsHeader
        ativos={ativos.length}
        somLigado={somLigado}
        onToggleSom={() => setSomLigado((v) => !v)}
      />

      <KdsConnectionBanner
        status={rtStatus}
        onReconnect={rtReconnect}
        onReload={() => window.location.reload()}
      />

      {algumAtrasado && (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Pedido com mais de 15 min sem atualização!
        </div>
      )}

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Carregando pedidos…</div>
        ) : ativos.length === 0 ? (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
            <ChefHat className="h-12 w-12 opacity-40" />
            <p className="text-lg">Nenhum pedido na fila. ✨</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Coluna
              titulo="Recebido"
              count={recebidos.length}
              accent="text-blue-600 dark:text-blue-400"
            >
              {recebidos.map((p) => (
                <KdsCard
                  key={p.id}
                  mesa={mesas.get(p.mesa_id)?.numero ?? "?"}
                  status={cozinhaStatusMap.get(p.id) ?? "recebido"}
                  criadoEm={p.criado_em}
                  itens={itensPorPedido.get(p.id) ?? []}
                  observacao={p.observacao}
                  onAvancar={() => avancar(p)}
                  loading={atualizarDestinoMut.isPending}
                  onMarcarItem={marcarItem}
                  itemPendingId={itemPendingId}
                  garcomNome={nomeDoPedido(p)}
                />
              ))}
            </Coluna>

            <Coluna
              titulo="Em preparo"
              count={emPreparo.length}
              accent="text-amber-600 dark:text-amber-400"
            >
              {emPreparo.map((p) => (
                <KdsCard
                  key={p.id}
                  mesa={mesas.get(p.mesa_id)?.numero ?? "?"}
                  status={cozinhaStatusMap.get(p.id) ?? "em_preparo"}
                  criadoEm={p.criado_em}
                  itens={itensPorPedido.get(p.id) ?? []}
                  observacao={p.observacao}
                  onAvancar={() => avancar(p)}
                  loading={atualizarDestinoMut.isPending}
                  onMarcarItem={marcarItem}
                  itemPendingId={itemPendingId}
                  garcomNome={nomeDoPedido(p)}
                />
              ))}
            </Coluna>
          </div>
        )}
      </main>
    </div>
  );
}

function Coluna({
  titulo,
  count,
  accent,
  children,
}: {
  titulo: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Clock className={`h-3.5 w-3.5 ${accent}`} />
        <span>{titulo}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {count}
        </span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}