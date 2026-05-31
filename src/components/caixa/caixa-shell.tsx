import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Wallet, ArrowLeftRight, FileText, Receipt, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Restaurante } from "@/lib/restaurante.functions";
import type { TurnoCaixa } from "@/lib/caixa.functions";
import type { PapelMembro } from "@/lib/equipe.functions";

const ITENS = [
  { to: "/caixa", label: "Caixa", icon: Wallet, exact: true },
  { to: "/caixa/movimentos", label: "Movimentos", icon: ArrowLeftRight, exact: false },
  { to: "/caixa/pagamentos", label: "Pagamentos", icon: Receipt, exact: false },
  { to: "/caixa/relatorio", label: "Relatório", icon: FileText, exact: false },
] as const;

export function CaixaShell({
  restaurante,
  operadorNome,
  turno,
  onSignOut,
  userId,
  papel,
  isPlatformAdmin,
  children,
}: {
  restaurante: Restaurante;
  operadorNome: string | null | undefined;
  turno: TurnoCaixa | null;
  onSignOut: () => Promise<void>;
  userId?: string | null;
  papel?: PapelMembro | null;
  isPlatformAdmin?: boolean;
  children: React.ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const souDono = !!(turno && userId && turno.operador_user_id === userId);
  const modoLeitura = !!turno && (isPlatformAdmin || !souDono);
  const badgeModo = isPlatformAdmin
    ? { label: "Modo suporte (leitura)", variant: "outline" as const }
    : turno && !souDono
      ? { label: `Leitura · operador ${turno.operador_nome}`, variant: "outline" as const }
      : null;

  const alertaHoras = restaurante.caixa_alerta_horas ?? 12;
  const horasAberto = useMemo(() => {
    if (!turno?.aberto_em) return 0;
    const ms = Date.now() - new Date(turno.aberto_em).getTime();
    return ms / 1000 / 60 / 60;
  }, [turno?.aberto_em]);
  const turnoLongo = !!turno && horasAberto >= alertaHoras;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{restaurante.nome}</div>
            <div className="truncate text-xs text-muted-foreground">
              Área do Caixa
              {operadorNome ? ` · ${operadorNome}` : ""}
            </div>
          </div>
          {turno ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Turno aberto</Badge>
          ) : (
            <Badge variant="secondary">Sem turno</Badge>
          )}
          {badgeModo && (
            <Badge variant={badgeModo.variant} className="hidden sm:inline-flex">
              {badgeModo.label}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>

        <nav className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
          {ITENS.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        {turnoLongo && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Este turno está aberto há mais de {alertaHoras}h
              ({Math.floor(horasAberto)}h). Verifique se o caixa anterior foi
              corretamente fechado.
            </div>
          </div>
        )}
        {modoLeitura && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            {isPlatformAdmin
              ? "Super-admin opera o caixa em modo somente leitura. Para destravar uma situação, promova um admin do restaurante."
              : `Turno em uso por ${turno?.operador_nome}. Você está em modo leitura.`}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}