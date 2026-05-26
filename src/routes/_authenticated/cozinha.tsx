import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, ChefHat } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useTick } from "@/hooks/use-tick";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { usePedidosDoDia, useAtualizarStatusPedido } from "@/hooks/use-pedidos";

import { KdsHeader } from "@/components/cozinha/kds-header";
import { KdsCard } from "@/components/cozinha/kds-card";

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
}
interface Item {
  id: string;
  pedido_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
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

  const { data, isLoading } = usePedidosDoDia(restauranteId ?? undefined);
  const atualizarStatusMut = useAtualizarStatusPedido(restauranteId ?? undefined);

  const pedidos = (data?.pedidos ?? []) as Pedido[];
  const itens = (data?.itens ?? []) as Item[];
  const mesas = useMemo(() => {
    const m = new Map<string, Mesa>();
    for (const x of (data?.mesas ?? []) as Mesa[]) m.set(x.id, x);
    return m;
  }, [data?.mesas]);
  const mesasRef = useRef(mesas);
  useEffect(() => { mesasRef.current = mesas; }, [mesas]);

  const itensPorPedido = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of itens) {
      if (!m.has(it.pedido_id)) m.set(it.pedido_id, []);
      m.get(it.pedido_id)!.push(it);
    }
    return m;
  }, [itens]);

  // Realtime + beep no INSERT
  useEffect(() => {
    if (!restauranteId) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) });
        timeout = null;
      }, 1000);
    };
    const channel = supabase
      .channel(`kds-${restauranteId}`)
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
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc]);

  const ativos = pedidos.filter((p) => p.status === "recebido" || p.status === "em_preparo");
  const recebidos = ativos.filter((p) => p.status === "recebido");
  const emPreparo = ativos.filter((p) => p.status === "em_preparo");

  const algumAtrasado = ativos.some(
    (p) => (Date.now() - new Date(p.criado_em).getTime()) / 60000 >= 15,
  );

  const avancar = async (p: Pedido) => {
    const next: StatusPedido = p.status === "recebido" ? "em_preparo" : "pronto";
    try {
      await atualizarStatusMut.mutateAsync({ id: p.id, status: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar pedido");
    }
  };

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
                  status={p.status}
                  criadoEm={p.criado_em}
                  itens={itensPorPedido.get(p.id) ?? []}
                  observacao={p.observacao}
                  onAvancar={() => avancar(p)}
                  loading={atualizarStatusMut.isPending}
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
                  status={p.status}
                  criadoEm={p.criado_em}
                  itens={itensPorPedido.get(p.id) ?? []}
                  observacao={p.observacao}
                  onAvancar={() => avancar(p)}
                  loading={atualizarStatusMut.isPending}
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