import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SalaHeader } from "@/components/sala/sala-header";
import { PratosProntosList } from "@/components/sala/pratos-prontos-list";
import { MinhasMesasGrid } from "@/components/sala/minhas-mesas-grid";
import { ChamadosList } from "@/components/sala/chamados-list";
import { OutraMesaModal } from "@/components/sala/outra-mesa-modal";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  useSalaDados,
  useRealtimeSala,
  useConfirmarEntregaSala,
  useAtenderChamadoSala,
} from "@/hooks/use-sala";

export const Route = createFileRoute("/_authenticated/sala")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
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
  const { garcom: garcomCtx } = Route.useRouteContext() as {
    garcom: { id: string; nome: string };
  };
  const { data, isLoading } = useSalaDados();
  const [tab, setTab] = useState<"prontos" | "mesas" | "chamados">("prontos");
  const [pendingPedidoId, setPendingPedidoId] = useState<string | null>(null);
  const [pendingChamadoId, setPendingChamadoId] = useState<string | null>(null);
  const [outraMesaOpen, setOutraMesaOpen] = useState(false);
  const navigate = useNavigate();

  const restauranteId = data?.garcom.restaurante_id;
  const mesas = data?.mesas ?? [];
  const mesaIds = useMemo(() => mesas.map((m) => m.id), [mesas]);

  useRealtimeSala(restauranteId, mesaIds);

  const confirmar = useConfirmarEntregaSala(restauranteId);
  const atender = useAtenderChamadoSala(restauranteId);

  const prontosPorMesa = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data?.pedidos_prontos ?? []) {
      m.set(p.mesa_id, (m.get(p.mesa_id) ?? 0) + 1);
    }
    return m;
  }, [data?.pedidos_prontos]);

  const chamadosPorMesa = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data?.chamados_pendentes ?? []) {
      m.set(c.mesa_id, (m.get(c.mesa_id) ?? 0) + 1);
    }
    return m;
  }, [data?.chamados_pendentes]);

  const totalChamados = data?.chamados_pendentes.length ?? 0;
  const totalProntos = data?.pedidos_prontos.length ?? 0;

  const nome = data?.garcom.nome ?? garcomCtx.nome;
  const permitirCruzado = data?.permitir_atendimento_cruzado ?? false;

  return (
    <div className="min-h-screen bg-background">
      <SalaHeader
        nome={nome}
        mesas={mesas}
        chamadosPendentes={totalChamados}
        onIrChamados={() => setTab("chamados")}
      />
      <main className="mx-auto max-w-3xl px-4 py-4">
        {permitirCruzado && restauranteId && (
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOutraMesaOpen(true)}
            >
              <Search className="mr-1 h-4 w-4" />
              Outra mesa
            </Button>
          </div>
        )}
        {isLoading && !data ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prontos">
                Prontos{totalProntos > 0 && ` (${totalProntos})`}
              </TabsTrigger>
              <TabsTrigger value="mesas">
                Mesas{mesas.length > 0 && ` (${mesas.length})`}
              </TabsTrigger>
              <TabsTrigger value="chamados">
                Chamados{totalChamados > 0 && ` (${totalChamados})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="prontos" className="mt-4">
              <PratosProntosList
                pedidos={data?.pedidos_prontos ?? []}
                pendingId={pendingPedidoId}
                onConfirmarEntrega={(id) => {
                  setPendingPedidoId(id);
                  confirmar.mutate(id, {
                    onSettled: () => setPendingPedidoId(null),
                  });
                }}
              />
            </TabsContent>
            <TabsContent value="mesas" className="mt-4">
              <MinhasMesasGrid
                mesas={mesas}
                prontosPorMesa={prontosPorMesa}
                chamadosPorMesa={chamadosPorMesa}
              />
            </TabsContent>
            <TabsContent value="chamados" className="mt-4">
              <ChamadosList
                chamados={data?.chamados_pendentes ?? []}
                pendingId={pendingChamadoId}
                onAtender={(id) => {
                  setPendingChamadoId(id);
                  atender.mutate(id, {
                    onSettled: () => setPendingChamadoId(null),
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
      {outraMesaOpen && restauranteId && data?.garcom.id && (
        <OutraMesaModal
          restauranteId={restauranteId}
          meuGarcomId={data.garcom.id}
          onClose={() => setOutraMesaOpen(false)}
          onSelecionar={(mesaId) => {
            setOutraMesaOpen(false);
            navigate({
              to: "/sala/nova-comanda/$mesaId",
              params: { mesaId },
            });
          }}
        />
      )}
    </div>
  );
}