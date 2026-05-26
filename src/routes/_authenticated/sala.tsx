import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sala")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
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
  const { garcom } = Route.useRouteContext() as {
    garcom: { id: string; nome: string };
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 text-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
        <h1 className="text-2xl font-bold tracking-tight">Olá, {garcom.nome}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua área de trabalho como garçom estará disponível em breve
          (pratos prontos, mesas atribuídas e chamados em tempo real).
        </p>
      </div>
    </div>
  );
}