import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useTurnoAtivo } from "@/hooks/use-caixa";
import { CaixaShell } from "@/components/caixa/caixa-shell";
import { queryKeys } from "@/lib/query-keys";
import { getMeuRestauranteFn } from "@/lib/restaurante.functions";
import { verificarPlatformAdmin } from "@/lib/superadmin.functions";
import { getMeuPapelFn } from "@/lib/equipe.functions";

export const Route = createFileRoute("/_authenticated/caixa")({
  beforeLoad: async ({ context }) => {
    const { queryClient, session } = context as {
      queryClient: import("@tanstack/react-query").QueryClient;
      session?: { user: { id: string } } | null;
    };
    const userId = session?.user.id;
    if (!userId) return {};

    const [restaurante, paData, papelData] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: queryKeys.meuRestaurante(userId),
        queryFn: () => getMeuRestauranteFn(),
      }),
      queryClient.ensureQueryData({
        queryKey: ["platform-admin"],
        queryFn: () => verificarPlatformAdmin(),
      }),
      queryClient.ensureQueryData({
        queryKey: ["meu-papel"],
        queryFn: () => getMeuPapelFn(),
      }),
    ]);

    if (!restaurante) {
      throw redirect({ to: paData?.isPlatformAdmin ? "/superadmin" : "/cadastro" });
    }

    const isPlatformAdmin = !!paData?.isPlatformAdmin;
    const papel = papelData?.papel ?? null;
    if (!isPlatformAdmin && papel !== "admin" && papel !== "caixa") {
      throw redirect({ to: "/" });
    }

    return {};
  },
  component: CaixaLayout,
});

function CaixaLayout() {
  const { user, signOut } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);
  const { data: turno } = useTurnoAtivo(restaurante?.id);

  if (isLoading || !restaurante) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <CaixaShell
      restaurante={restaurante}
      operadorNome={user?.email ?? null}
      turno={turno ?? null}
      onSignOut={signOut}
    >
      <Outlet />
    </CaixaShell>
  );
}