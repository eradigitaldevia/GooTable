import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  Settings,
  LogOut,
  Shield,
  Eye,
  Users,
  Gift,
  Ticket,
  Bell,
  ChefHat,
  UserCog,
  UsersRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurante } from "@/lib/restaurante.functions";
import { listarChamadosFn } from "@/lib/chamados.functions";
import type { PapelMembro } from "@/lib/equipe.functions";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList, exact: false },
  { to: "/caixa", label: "Caixa", icon: Wallet, exact: false },
  { to: "/admin/cardapio", label: "Cardápio", icon: UtensilsCrossed, exact: true },
  { to: "/admin/cardapio-preview", label: "Prévia do cardápio", icon: Eye, exact: false },
  { to: "/admin/destinos-preparo", label: "Destinos de preparo", icon: ChefHat, exact: false },
  { to: "/admin/mesas", label: "Mesas", icon: QrCode, exact: false },
  { to: "/admin/chamados", label: "Chamados", icon: Bell, exact: false },
  { to: "/cozinha", label: "Display de cozinha", icon: ChefHat, exact: false, target: "_blank" as const },
  { to: "/bar", label: "Display do bar", icon: ChefHat, exact: false, target: "_blank" as const },
  { to: "/admin/clientes", label: "Clientes", icon: Users, exact: false },
  { to: "/admin/fidelidade", label: "Fidelidade", icon: Gift, exact: false },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket, exact: false },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, exact: false },
  { to: "/admin/equipe", label: "Equipe", icon: UserCog, exact: false },
  { to: "/admin/garcons", label: "Garçons", icon: UsersRound, exact: false },
] as const;

function useChamadosPendentesCount(restauranteId: string) {
  const fn = useServerFn(listarChamadosFn);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["chamados", restauranteId, true],
    queryFn: () => fn({ data: { restauranteId, apenasPendentes: true } }),
    enabled: !!restauranteId,
  });
  const instanceId = useId();
  useEffect(() => {
    if (!restauranteId) return;
    const channel = supabase
      .channel(`rt-chamados-side-${restauranteId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chamados_garcom",
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["chamados", restauranteId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restauranteId, qc, instanceId]);
  return query.data?.length ?? 0;
}

export function AdminSidebar({
  restaurante,
  isPlatformAdmin,
  onSignOut,
  collapsed = false,
  papel,
}: {
  restaurante: Restaurante;
  isPlatformAdmin: boolean;
  onSignOut: () => Promise<void>;
  collapsed?: boolean;
  papel?: PapelMembro | null;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const pendentes = useChamadosPendentesCount(restaurante.id);
  const podeVerEquipe = isPlatformAdmin || papel === "admin";
  const navItems = NAV.filter(
    (item) => {
      if (item.to === "/admin/equipe" && !podeVerEquipe) return false;
      return true;
    },
  );
  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b border-sidebar-border",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <QrCode className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{restaurante.nome}</div>
            <div className="truncate text-xs text-muted-foreground">/{restaurante.slug}</div>
          </div>
        )}
      </div>

      <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3")}>
        {navItems.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const showBadge = item.to === "/admin/chamados" && pendentes > 0;
          const link = (
            <Link
              key={item.to}
              to={item.to}
              target={(item as { target?: string }).target}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-colors",
                collapsed
                  ? "justify-center p-2.5"
                  : "gap-3 px-3 py-2.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <span className="relative">
                <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                {collapsed && showBadge && (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2 rounded-full bg-destructive" />
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                      {pendentes}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
          if (collapsed) {
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        {isPlatformAdmin && (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/superadmin"
                  className="mb-2 flex items-center justify-center rounded-xl p-2.5 text-sm font-medium text-primary hover:bg-sidebar-accent/60"
                >
                  <Shield className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Super-Admin</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/superadmin"
              className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-sidebar-accent/60"
            >
              <Shield className="h-4 w-4" />
              Super-Admin
            </Link>
          )
        )}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-full" onClick={onSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
