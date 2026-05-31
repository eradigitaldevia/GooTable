import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Wallet, ArrowLeftRight, FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Restaurante } from "@/lib/restaurante.functions";
import type { TurnoCaixa } from "@/lib/caixa.functions";

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
  children,
}: {
  restaurante: Restaurante;
  operadorNome: string | null | undefined;
  turno: TurnoCaixa | null;
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });

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

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}