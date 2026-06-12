import { useEffect, useState } from "react";
import { LogOut, AlertTriangle, ChevronDown, ChevronUp, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PratosProntosList } from "@/components/sala/pratos-prontos-list";
import type { CumimDados } from "@/lib/cumim.functions";

function minutosDesde(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function CumimDisplay({
  dados,
  isLoading,
  onConfirmarEntrega,
  pendingId,
  readOnly = false,
}: {
  dados: CumimDados | null | undefined;
  isLoading: boolean;
  onConfirmarEntrega?: (pedidoId: string) => void;
  pendingId?: string | null;
  readOnly?: boolean;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const [histAberto, setHistAberto] = useState(false);

  const nome = dados?.cumim.nome ?? "";
  const inicial = (nome.trim()[0] ?? "?").toUpperCase();
  const prontos = dados?.pedidos_prontos ?? [];
  const atrasados = prontos.filter((p) => minutosDesde(p.criado_em) >= 5).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{nome || "Cumim"}</span>
              <Badge variant="outline" className="text-[10px]">
                Runner
              </Badge>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              Entregue os pratos prontos da cozinha
            </div>
          </div>
          {!readOnly && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Sair"
              onClick={() => {
                void supabase.auth.signOut().then(() => {
                  window.location.assign("/login");
                });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mx-auto mt-3 grid max-w-3xl grid-cols-3 gap-2">
          <MetricaCard
            label="Prontos agora"
            value={String(prontos.length)}
            tone={prontos.length > 0 ? "primary" : "muted"}
          />
          <MetricaCard
            label="Entregas no turno"
            value={String(dados?.entregas_turno ?? 0)}
          />
          <MetricaCard
            label="Tempo médio"
            value={
              dados?.tempo_medio_entrega_min == null
                ? "—"
                : `${dados.tempo_medio_entrega_min} min`
            }
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {atrasados > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {atrasados} prato{atrasados > 1 ? "s" : ""} atrasado
            {atrasados > 1 ? "s" : ""} (mais de 5 min)
          </div>
        )}

        {isLoading && !dados ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : !dados ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Cumim não encontrado ou inativo.
          </p>
        ) : (
          <>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Pratos prontos para entregar
            </h2>
            {prontos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Nenhum prato pronto. Aguardando a cozinha.
              </p>
            ) : (
              <PratosProntosList
                pedidos={prontos}
                pendingId={pendingId}
                onConfirmarEntrega={onConfirmarEntrega}
                readOnly={readOnly}
              />
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setHistAberto((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent/50"
              >
                <span className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  Histórico do turno ({dados.ultimas_entregas.length})
                </span>
                {histAberto ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {histAberto && (
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
                  {dados.ultimas_entregas.length === 0 && (
                    <li className="px-4 py-3 text-sm text-muted-foreground">
                      Nenhuma entrega registrada hoje.
                    </li>
                  )}
                  {dados.ultimas_entregas.map((e) => {
                    const hora = new Date(e.entregue_em).toLocaleTimeString(
                      "pt-BR",
                      { hour: "2-digit", minute: "2-digit" },
                    );
                    return (
                      <li
                        key={e.pedido_id}
                        className="flex items-center justify-between px-4 py-2 text-sm"
                      >
                        <span className="font-medium">Mesa {e.mesa_numero}</span>
                        <span className="text-xs text-muted-foreground">
                          {hora}
                          {e.tempo_entrega_min != null
                            ? ` · ${e.tempo_entrega_min} min`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function MetricaCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "primary";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-background/60 px-2 py-1.5 text-center">
      <div className={`text-base font-bold tabular-nums ${toneCls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}