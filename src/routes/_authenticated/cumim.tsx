import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CumimDisplay } from "@/components/cumim/cumim-display";
import {
  useCumimDados,
  useConfirmarEntregaCumim,
  useRealtimeCumim,
} from "@/hooks/use-cumim";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cumim")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) throw redirect({ to: "/login" });

    const { data: cumim } = await supabase
      .from("cumins")
      .select("id")
      .eq("user_id", uid)
      .eq("ativo", true)
      .maybeSingle();
    if (cumim) return {};

    const { data: garcom } = await supabase
      .from("garcons")
      .select("id")
      .eq("user_id", uid)
      .eq("ativo", true)
      .maybeSingle();
    if (garcom) throw redirect({ to: "/sala" });

    throw redirect({ to: "/admin" });
  },
  component: CumimPage,
});

function CumimPage() {
  const { data, isLoading } = useCumimDados();
  const confirmar = useConfirmarEntregaCumim();
  const [pendingId, setPendingId] = useState<string | null>(null);

  useRealtimeCumim(data?.cumim.restaurante_id);

  return (
    <CumimDisplay
      dados={data}
      isLoading={isLoading}
      pendingId={pendingId}
      onConfirmarEntrega={(id) => {
        setPendingId(id);
        confirmar.mutate(id, {
          onSuccess: () => toast.success("Entrega confirmada"),
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : "Erro"),
          onSettled: () => setPendingId(null),
        });
      }}
    />
  );
}