import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useVerificarPlatformAdmin } from "@/hooks/use-superadmin";
import { useMeuPapel } from "@/hooks/use-equipe";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";
import { useRouterState } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { queryKeys } from "@/lib/query-keys";
import { getMeuRestauranteFn } from "@/lib/restaurante.functions";
import { verificarPlatformAdmin } from "@/lib/superadmin.functions";
import { getMeuPapelFn } from "@/lib/equipe.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { queryClient, session } = context as {
      queryClient: import("@tanstack/react-query").QueryClient;
      session?: { user: { id: string } } | null;
    };
    const userId = session?.user.id;
    if (!userId) return {};

    const [restaurante, paData] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: queryKeys.meuRestaurante(userId),
        queryFn: () => getMeuRestauranteFn(),
      }),
      queryClient.ensureQueryData({
        queryKey: ["platform-admin"],
        queryFn: () => verificarPlatformAdmin(),
      }),
    ]);

    if (!restaurante) {
      throw redirect({ to: paData?.isPlatformAdmin ? "/superadmin" : "/cadastro" });
    }

    if (!paData?.isPlatformAdmin) {
      const papelData = await queryClient.ensureQueryData({
        queryKey: ["meu-papel"],
        queryFn: () => getMeuPapelFn(),
      });
      if (papelData?.papel === "cozinheiro") {
        throw redirect({ to: "/cozinha" });
      }
      if (papelData?.papel === "bar") {
        throw redirect({ to: "/bar" });
      }
    }

    return {
      restauranteId: restaurante.id as string,
      isPlatformAdmin: !!paData?.isPlatformAdmin,
    };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const { data: restaurante, isLoading: loadingRest } = useMeuRestaurante(user?.id);
  const { data: paData, isLoading: loadingPa } = useVerificarPlatformAdmin(!!user);
  const isPlatformAdmin = !!paData?.isPlatformAdmin;
  const { data: papelData } = useMeuPapel(!!user);
  const papel = papelData?.papel ?? null;

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  useEffect(() => {
    if (loadingRest || loadingPa) return;
    if (!user) return;
    if (!restaurante) {
      if (isPlatformAdmin) navigate({ to: "/superadmin" });
      else navigate({ to: "/cadastro" });
    }
  }, [user, restaurante, isPlatformAdmin, loadingRest, loadingPa, navigate]);

  if (loadingRest || loadingPa || !restaurante) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex lg:hidden">
        <AdminSidebar
          restaurante={restaurante}
          isPlatformAdmin={isPlatformAdmin}
          onSignOut={handleSignOut}
          collapsed
          papel={papel}
        />
      </aside>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <AdminSidebar
          restaurante={restaurante}
          isPlatformAdmin={isPlatformAdmin}
          onSignOut={handleSignOut}
          papel={papel}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar shadow-2xl">
            <AdminSidebar
              restaurante={restaurante}
              isPlatformAdmin={isPlatformAdmin}
              onSignOut={handleSignOut}
              papel={papel}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileHeader nome={restaurante.nome} onOpen={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {!restaurante.ativo && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">Conta suspensa</div>
                <p className="text-destructive/80">
                  Seu restaurante está temporariamente suspenso e não recebe novos pedidos. Contate o suporte.
                </p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
